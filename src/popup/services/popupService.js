// src/popup/services/popupService.ts
/**
 * Get the currently active tab.
 * When opened as a standalone window via chrome.windows.create the target
 * tabId is passed as a URL query parameter so we resolve it directly.
 */
export async function getActiveTab() {
    // Standalone window mode: tabId passed via URL param
    const params = new URLSearchParams(window.location.search);
    const tabIdParam = params.get("tabId");
    if (tabIdParam) {
        try {
            const tab = await chrome.tabs.get(parseInt(tabIdParam, 10));
            if (tab)
                return tab;
        }
        catch (_) {
            // Tab may have been closed; fall through
        }
    }
    // Normal popup: active tab in current window
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0])
        return tabs[0];
    // Last fallback: active tab in any normal browser window
    const allActive = await chrome.tabs.query({ active: true });
    const webTab = allActive.find((t) => t.url &&
        !t.url.startsWith("chrome-extension://") &&
        !t.url.startsWith("chrome://"));
    if (webTab)
        return webTab;
    throw new Error("No active tab found");
}
/**
 * Get the current tab URL
 */
export async function getCurrentTabUrl() {
    const tab = await getActiveTab();
    return tab.url || "";
}
/**
 * Send a message to the content script in a specific tab
 */
export async function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            }
            else if (!response) {
                reject(new Error("No response from content script"));
            }
            else {
                resolve(response);
            }
        });
    });
}
/**
 * Load fields from the active tab
 */
export async function loadFieldsFromTab() {
    const tab = await getActiveTab();
    if (!tab.id) {
        throw new Error("Tab has no ID");
    }
    const response = await sendMessageToTab(tab.id, {
        action: "GET_FIELDS",
    });
    return response.fields;
}
/**
 * Send fill all fields message to the active tab
 */
export async function fillTabFields(profile) {
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
export async function magicFillTab() {
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
export async function saveFieldData(data) {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve);
    });
}
/**
 * Load field data from storage
 */
export async function loadFieldData(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
    });
}
/**
 * Get all profiles from storage
 */
export async function getAllProfiles() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["profiles"], (result) => {
            resolve(result.profiles || {});
        });
    });
}
/**
 * Save all profiles to storage
 */
export async function saveAllProfiles(profiles) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ profiles }, resolve);
    });
}
/**
 * Create a new profile
 */
export async function createProfile(name, url, fields) {
    const profiles = await getAllProfiles();
    const id = `profile_${Date.now()}`;
    const newProfile = {
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
export async function deleteProfile(profileId) {
    const profiles = await getAllProfiles();
    delete profiles[profileId];
    await saveAllProfiles(profiles);
    // Also delete associated field data
    const keysToRemove = [];
    const allData = await new Promise((resolve) => {
        chrome.storage.local.get(null, resolve);
    });
    for (const key in allData) {
        if (key.startsWith(`autofill_${profileId}_`)) {
            keysToRemove.push(key);
        }
    }
    if (keysToRemove.length > 0) {
        await new Promise((resolve) => {
            chrome.storage.local.remove(keysToRemove, resolve);
        });
    }
}
/**
 * Get a specific profile
 */
export async function getProfile(profileId) {
    const profiles = await getAllProfiles();
    return profiles[profileId] || null;
}
/**
 * Save profile field values
 */
export async function saveProfileFieldValues(profileId, fieldValues) {
    const dataToSave = {};
    for (const [fieldName, value] of Object.entries(fieldValues)) {
        dataToSave[`autofill_${profileId}_${fieldName}`] = value;
    }
    await saveFieldData(dataToSave);
}
/**
 * Load profile field values
 */
export async function loadProfileFieldValues(profileId, fieldNames) {
    const keys = fieldNames.map((name) => `autofill_${profileId}_${name}`);
    const result = await loadFieldData(keys);
    const values = {};
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
export async function getActiveProfile() {
    const result = await loadFieldData(["activeProfile"]);
    return result.activeProfile || "";
}
/**
 * Set the active profile in storage
 */
export async function setActiveProfile(profile) {
    return saveFieldData({ activeProfile: profile });
}
//# sourceMappingURL=popupService.js.map