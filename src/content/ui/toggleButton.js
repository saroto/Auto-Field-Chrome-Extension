// src/content/ui/toggleButton.ts
import { STORAGE_KEY_PREFIX } from "../../shared/constants.js";
let toggleButton = null;
let activeInput = null;
/**
 * Create and cache the toggle button element
 */
function createToggleButton() {
    if (toggleButton)
        return toggleButton;
    toggleButton = document.createElement("div");
    toggleButton.className = "autofill-extension-toggle";
    toggleButton.addEventListener("mousedown", async (e) => {
        e.preventDefault(); // Keep focus on the input
        e.stopPropagation();
        if (!activeInput) {
            console.warn("Autofill Extension: No active input found when toggle was clicked.");
            return;
        }
        const nameAttr = activeInput.name || activeInput.id;
        if (!nameAttr) {
            console.warn("Autofill Extension: Active input has no name or id attribute.");
            return;
        }
        const activeProfileData = await chrome.storage.local.get("activeProfile");
        const activeProfile = activeProfileData.activeProfile || "Profile1";
        const storageKey = `${STORAGE_KEY_PREFIX}_${activeProfile}_${nameAttr}`;
        const data = await chrome.storage.local.get(storageKey);
        if (data[storageKey] !== undefined) {
            // Small timeout ensures the event loop processes this after any blur anomalies
            setTimeout(() => {
                if (activeInput) {
                    activeInput.value = data[storageKey];
                    activeInput.dispatchEvent(new Event("input", { bubbles: true }));
                    activeInput.dispatchEvent(new Event("change", { bubbles: true }));
                    console.log(`Autofill Extension: Filled ${nameAttr} with saved data.`);
                    hide();
                }
            }, 10);
        }
        else {
            console.warn(`Autofill Extension: No saved data found for key ${storageKey}.`);
        }
    });
    document.body.appendChild(toggleButton);
    return toggleButton;
}
/**
 * Show the toggle button next to an input element
 */
export function show(input) {
    activeInput = input;
    const btn = createToggleButton();
    const rect = input.getBoundingClientRect();
    // Use fixed positioning so it's not affected by `transform` stacking contexts in modals
    btn.style.position = "fixed";
    // Position the button on the right side of the input (relative to viewport)
    btn.style.top = `${rect.top + rect.height / 2 - 12}px`;
    btn.style.left = `${rect.right - 30}px`;
    btn.style.display = "flex";
}
/**
 * Hide the toggle button
 */
export function hide() {
    if (toggleButton) {
        toggleButton.style.display = "none";
        activeInput = null;
    }
}
//# sourceMappingURL=toggleButton.js.map