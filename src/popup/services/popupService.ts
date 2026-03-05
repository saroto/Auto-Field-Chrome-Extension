// src/popup/services/popupService.ts

import { Field } from "../../shared/types.js";

/**
 * Get the currently active tab
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) {
    throw new Error("No active tab found");
  }
  return tabs[0];
}

/**
 * Send a message to the content script in a specific tab
 */
export async function sendMessageToTab<T>(
  tabId: number,
  message: any,
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
export async function saveFieldData(data: Record<string, string>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set(data, resolve);
  });
}

/**
 * Load field data from storage
 */
export async function loadFieldData(keys: string[]): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, resolve);
  });
}

/**
 * Get the active profile from storage
 */
export async function getActiveProfile(): Promise<string> {
  const result = await loadFieldData(["activeProfile"]);
  return result.activeProfile || "Profile1";
}

/**
 * Set the active profile in storage
 */
export async function setActiveProfile(profile: string): Promise<void> {
  return saveFieldData({ activeProfile: profile });
}
