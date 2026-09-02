// src/content/services/formFiller.ts

import { getAllInputs, getFieldInfo } from "./fieldDetector.js";
import { flashField } from "../ui/flashField.js";

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

  // Derive each key through getFieldInfo, exactly as the popup did when it
  // saved. Reading el.name || el.id instead would miss every field whose key
  // was generated from its label and position, so those never filled.
  const keyByElement = new Map<Element, string>();
  allInputs.forEach((el) => {
    const info = getFieldInfo(el);
    if (info) keyByElement.set(el, info.name);
  });

  const storageKeysToFetch = Array.from(
    new Set(keyByElement.values()),
  ).map((name) => `autofill_${activeProfileId}_${name}`);

  if (storageKeysToFetch.length === 0) return;

  const data = await chrome.storage.local.get(storageKeysToFetch);

  allInputs.forEach((el) => {
    const name = keyByElement.get(el);
    if (!name) return;

    const storageKey = `autofill_${activeProfileId}_${name}`;
    if (data[storageKey] === undefined) return;

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
    flashField(el, "saved");
  });

  console.log(
    "Autofill Extension: All fields filled from profile",
    activeProfileId,
  );
}
