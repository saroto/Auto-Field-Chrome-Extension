// src/content/services/formFiller.ts

import { getAllInputs } from "./fieldDetector.js";
import { IGNORED_INPUT_TYPES, STORAGE_KEY_PREFIX } from "../../shared/constants.js";

/**
 * Fill all fields with saved data from the active profile
 */
export async function fillAllFields(profile?: string): Promise<void> {
  const activeProfileData = await chrome.storage.sync.get("activeProfile");
  const activeProfile = profile || activeProfileData.activeProfile || "Profile1";
  const allInputs = getAllInputs();
  const storageKeysToFetch: string[] = [];

  allInputs.forEach((el) => {
    const type = el instanceof HTMLSelectElement ? "select" : (el as HTMLInputElement).type?.toLowerCase();
    if (!IGNORED_INPUT_TYPES.includes(type as any)) {
      const nameAttr = el.name || el.id;
      if (nameAttr) {
        storageKeysToFetch.push(`${STORAGE_KEY_PREFIX}_${activeProfile}_${nameAttr}`);
      }
    }
  });

  if (storageKeysToFetch.length > 0) {
    const data = await chrome.storage.sync.get(storageKeysToFetch);
    allInputs.forEach((el) => {
      const nameAttr = el.name || el.id;
      const storageKey = `${STORAGE_KEY_PREFIX}_${activeProfile}_${nameAttr}`;
      if (nameAttr && data[storageKey]) {
        const value = data[storageKey] as string;
        if (el instanceof HTMLSelectElement) {
          el.value = value;
        } else {
          el.value = value;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    console.log("Autofill Extension: All fields filled from profile", activeProfile);
  }
}
