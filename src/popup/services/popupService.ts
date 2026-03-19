// src/popup/services/popupService.ts

import { ContentMessage, Field, Profile, ProfileData } from "../../shared/types.js";

/**
 * Get the currently active tab.
 * When opened as a standalone window via chrome.windows.create the target
 * tabId is passed as a URL query parameter so we resolve it directly.
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  // Standalone window mode: tabId passed via URL param
  const params = new URLSearchParams(window.location.search);
  const tabIdParam = params.get("tabId");
  if (tabIdParam) {
    try {
      const tab = await chrome.tabs.get(parseInt(tabIdParam, 10));
      if (tab) return tab;
    } catch (_) {
      // Tab may have been closed; fall through
    }
  }

  // Normal popup: active tab in current window
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) return tabs[0];

  // Last fallback: active tab in any normal browser window
  const allActive = await chrome.tabs.query({ active: true });
  const webTab = allActive.find(
    (t) =>
      t.url &&
      !t.url.startsWith("chrome-extension://") &&
      !t.url.startsWith("chrome://"),
  );
  if (webTab) return webTab;

  throw new Error("No active tab found");
}

/**
 * Get the current tab URL
 */
export async function getCurrentTabUrl(): Promise<string> {
  const tab = await getActiveTab();
  return tab.url || "";
}

/**
 * Send a message to the content script in a specific tab
 */
export async function sendMessageToTab<T>(
  tabId: number,
  message: ContentMessage,
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!response) {
        reject(new Error("No response from content script"));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Load fields from the active tab
 */
export async function loadFieldsFromTab(): Promise<Field[]> {
  const tab = await getActiveTab();
  if (!tab.id) {
    throw new Error("Tab has no ID");
  }
  const response = await sendMessageToTab<{ fields: Field[] }>(tab.id, {
    action: "GET_FIELDS",
  });
  return response.fields;
}

/**
 * Send fill all fields message to the active tab
 */
export async function fillTabFields(profile: string): Promise<void> {
  const tab = await getActiveTab();
  if (!tab.id) {
    throw new Error("Tab has no ID");
  }
  await sendMessageToTab(tab.id, {
    action: "FILL_ALL_FIELDS",
    profile,
  });
}

/**
 * Send magic fill message to the active tab
 */
export async function magicFillTab(): Promise<void> {
  const tab = await getActiveTab();
  if (!tab.id) {
    throw new Error("Tab has no ID");
  }
  await sendMessageToTab(tab.id, {
    action: "MAGIC_FILL",
  });
}

/**
 * Save field data to storage
 */
export async function saveFieldData(
  data: Record<string, string>,
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

/**
 * Load field data from storage
 */
export async function loadFieldData(
  keys: string[],
): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

/**
 * Get all profiles from storage
 */
export async function getAllProfiles(): Promise<ProfileData> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["profiles"], (result) => {
      resolve((result.profiles as ProfileData) || {});
    });
  });
}

/**
 * Save all profiles to storage
 */
export async function saveAllProfiles(profiles: ProfileData): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ profiles }, resolve);
  });
}

/**
 * Create a new profile
 */
export async function createProfile(
  name: string,
  url: string,
  fields: Field[],
): Promise<Profile> {
  const profiles = await getAllProfiles();
  const id = `profile_${Date.now()}`;
  const newProfile: Profile = {
    id,
    name,
    url,
    createdAt: Date.now(),
    fields,
  };
  profiles[id] = newProfile;
  await saveAllProfiles(profiles);
  return newProfile;
}

/**
 * Delete a profile
 */
export async function deleteProfile(profileId: string): Promise<void> {
  const profiles = await getAllProfiles();
  delete profiles[profileId];
  await saveAllProfiles(profiles);

  // Also delete associated field data
  const keysToRemove: string[] = [];
  const allData = await new Promise<Record<string, any>>((resolve) => {
    chrome.storage.local.get(null, resolve);
  });

  for (const key in allData) {
    if (key.startsWith(`autofill_${profileId}_`)) {
      keysToRemove.push(key);
    }
  }

  if (keysToRemove.length > 0) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.remove(keysToRemove, resolve);
    });
  }
}

/**
 * Get a specific profile
 */
export async function getProfile(profileId: string): Promise<Profile | null> {
  const profiles = await getAllProfiles();
  return profiles[profileId] || null;
}

/**
 * Save profile field values
 */
export async function saveProfileFieldValues(
  profileId: string,
  fieldValues: Record<string, string>,
): Promise<void> {
  const dataToSave: Record<string, string> = {};
  for (const [fieldName, value] of Object.entries(fieldValues)) {
    dataToSave[`autofill_${profileId}_${fieldName}`] = value;
  }
  await saveFieldData(dataToSave);
}

/**
 * Load profile field values
 */
export async function loadProfileFieldValues(
  profileId: string,
  fieldNames: string[],
): Promise<Record<string, string>> {
  const keys = fieldNames.map((name) => `autofill_${profileId}_${name}`);
  const result = await loadFieldData(keys);
  const values: Record<string, string> = {};

  for (const fieldName of fieldNames) {
    const key = `autofill_${profileId}_${fieldName}`;
    if (result[key]) {
      values[fieldName] = result[key];
    }
  }

  return values;
}

/**
 * Get the active profile from storage
 */
export async function getActiveProfile(): Promise<string> {
  const result = await loadFieldData(["activeProfile"]);
  return result.activeProfile || "";
}

/**
 * Set the active profile in storage
 */
export async function setActiveProfile(profile: string): Promise<void> {
  return saveFieldData({ activeProfile: profile });
}

/**
 * Export all profiles and their field values as a JSON object
 */
export async function exportAllData(): Promise<Record<string, unknown>> {
  const profiles = await getAllProfiles();
  const allData = await new Promise<Record<string, unknown>>((resolve) => {
    chrome.storage.local.get(null, resolve);
  });

  const fieldValues: Record<string, string> = {};
  for (const key in allData) {
    if (key.startsWith("autofill_")) {
      fieldValues[key] = allData[key] as string;
    }
  }

  return { profiles, fieldValues };
}

/**
 * Import profiles and field values from exported JSON
 */
export async function importAllData(
  data: Record<string, unknown>,
): Promise<number> {
  const profiles = data.profiles as ProfileData | undefined;
  const fieldValues = data.fieldValues as Record<string, string> | undefined;

  if (!profiles || typeof profiles !== "object") {
    throw new Error("Invalid import data: missing profiles");
  }

  const existingProfiles = await getAllProfiles();
  const merged = { ...existingProfiles, ...profiles };
  await saveAllProfiles(merged);

  if (fieldValues && typeof fieldValues === "object") {
    await saveFieldData(fieldValues);
  }

  return Object.keys(profiles).length;
}
