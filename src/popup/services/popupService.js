// src/popup/services/popupService.ts
/**
 * Get the currently active tab
 */
export async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
        throw new Error("No active tab found");
    }
    return tabs[0];
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
        chrome.storage.sync.set(data, resolve);
    });
}
/**
 * Load field data from storage
 */
export async function loadFieldData(keys) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, resolve);
    });
}
/**
 * Get the active profile from storage
 */
export async function getActiveProfile() {
    const result = await loadFieldData(["activeProfile"]);
    return result.activeProfile || "Profile1";
}
/**
 * Set the active profile in storage
 */
export async function setActiveProfile(profile) {
    return saveFieldData({ activeProfile: profile });
}
//# sourceMappingURL=popupService.js.map