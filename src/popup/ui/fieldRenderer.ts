// src/popup/ui/fieldRenderer.ts

import { STORAGE_KEY_PREFIX } from "../../shared/constants.js";
import { Field } from "../../shared/types.js";

/**
 * Render fields in the popup DOM
 */
export function renderFields(fields: Field[], container: HTMLDivElement): void {
  container.innerHTML = "";

  if (fields.length === 0) {
    container.innerHTML =
      '<div style="font-size: 12px; color: #888;">No actionable fields found on this page.</div>';
    return;
  }

  fields.forEach((field) => {
    const label = document.createElement("label");
    label.htmlFor = `input_${field.name}`;
    label.textContent = field.label
      ? `Field: ${field.label}`
      : `Field: ${field.name}`;
    label.style.display = "block";
    label.style.marginTop = "10px";
    label.style.fontSize = "12px";
    label.style.color = "#666";

    let input: HTMLInputElement | HTMLSelectElement;

    if (field.type === "select") {
      input = document.createElement("select");
      input.id = `input_${field.name}`;
      input.dataset.fieldName = field.name;
      // Add an empty option as default
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "-- Select --";
      input.appendChild(emptyOption);
    } else {
      input = document.createElement("input");
      input.type = field.type === "email" ? "email" : "text";
      input.id = `input_${field.name}`;
      input.dataset.fieldName = field.name;
      input.placeholder = field.placeholder || field.name;
    }

    input.style.width = "100%";
    input.style.boxSizing = "border-box";
    input.style.padding = "8px";
    input.style.marginTop = "5px";
    input.style.border = "1px solid #ccc";
    input.style.borderRadius = "4px";

    container.appendChild(label);
    container.appendChild(input);
  });
}

/**
 * Load saved values for fields and populate the inputs
 */
export function loadSavedValues(
  fields: Field[],
  profile: string,
  container: HTMLDivElement,
): void {
  const keysToLoad = fields.map(
    (f) => `${STORAGE_KEY_PREFIX}_${profile}_${f.name}`,
  );

  chrome.storage.sync.get(keysToLoad, (result) => {
    fields.forEach((field) => {
      const inputEl = container.querySelector(
        `#input_${field.name}`,
      ) as HTMLInputElement | null;
      if (inputEl && result[`${STORAGE_KEY_PREFIX}_${profile}_${field.name}`]) {
        inputEl.value = result[`${STORAGE_KEY_PREFIX}_${profile}_${field.name}`] as string;
      }
    });
  });
}
