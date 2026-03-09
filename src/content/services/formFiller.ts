// src/content/services/formFiller.ts

import { getAllInputs } from "./fieldDetector.js";
import { IGNORED_INPUT_TYPES } from "../../shared/constants.js";

/**
 * Fill all fields with saved data from the active profile
 */
export async function fillAllFields(profileId?: string): Promise<void> {
  const activeProfileData = await chrome.storage.local.get("activeProfile");
  const activeProfileId = profileId || activeProfileData.activeProfile || "";

  if (!activeProfileId) {
    console.warn("No active profile selected");
    return;
  }

  const allInputs = getAllInputs();
  const storageKeysToFetch: string[] = [];

  allInputs.forEach((el) => {
    const type =
      el instanceof HTMLSelectElement
        ? "select"
        : (el as HTMLInputElement).type?.toLowerCase();
    if (!IGNORED_INPUT_TYPES.includes(type as any)) {
      const nameAttr = el.name || el.id;
      if (nameAttr) {
        storageKeysToFetch.push(`autofill_${activeProfileId}_${nameAttr}`);
      }
    }
  });

  if (storageKeysToFetch.length > 0) {
    const data = await chrome.storage.local.get(storageKeysToFetch);
    allInputs.forEach((el) => {
      const nameAttr = el.name || el.id;
      const storageKey = `autofill_${activeProfileId}_${nameAttr}`;
      if (nameAttr && data[storageKey] !== undefined) {
        const value = data[storageKey] as string;

        // Skip filling if the profile has no saved data for this field.
        // This prevents overwriting user's manually typed data with empty strings.
        if (value === "") return;

        if (el instanceof HTMLSelectElement) {
          el.value = value;
        } else if (el instanceof HTMLInputElement && el.type === "radio") {
          el.checked = el.value === value;
        } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
          // Checkbox group: saved as comma-separated values; single: "true"/"false"
          const checkedValues = value.split(",");
          el.checked = checkedValues.includes(el.value) || value === "true";
        } else {
          (el as HTMLInputElement).value = value;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    console.log(
      "Autofill Extension: All fields filled from profile",
      activeProfileId,
    );
  }
}
