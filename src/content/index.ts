// src/content/index.ts

console.log("🚀 Auto Fill Extension: Content script loaded!");

import * as toggleButton from "./ui/toggleButton.js";
import * as fieldDetector from "./services/fieldDetector.js";
import * as formFiller from "./services/formFiller.js";
import * as magicFiller from "./services/magicFiller.js";
import { IGNORED_INPUT_TYPES } from "../shared/constants.js";
import { ContentMessage, Field } from "../shared/types.js";

/**
 * Hide toggle button on scroll because its fixed position will become detached
 */
document.addEventListener(
  "scroll",
  () => {
    toggleButton.hide();
  },
  { capture: true, passive: true },
);

/**
 * Global focus listener to show toggle button when input is focused
 */
document.addEventListener("focusin", (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
    const input = target as HTMLInputElement | HTMLTextAreaElement;
    const type = input.type?.toLowerCase();
    // Ignore certain input types
    if (!IGNORED_INPUT_TYPES.includes(type as any)) {
      toggleButton.show(input);
    }
  }
});

/**
 * Hide button when clicking outside or focusing out
 */
document.addEventListener("focusout", (e) => {
  // Slight delay to allow click on the button to process
  setTimeout(() => {
    if (document.activeElement !== e.target) {
      toggleButton.hide();
    }
  }, 150);
});

/**
 * Handle keyboard shortcuts
 */
function handleKeyDown(event: KeyboardEvent) {
  const isModKey = event.metaKey || event.ctrlKey; // Support Cmd on Mac and Ctrl on Windows/Linux

  if (isModKey && event.key.toLowerCase() === "/") {
    event.preventDefault();
    formFiller.fillAllFields();
    console.log("Autofill Extension: Autofill shortcut triggered.");
  } else if (isModKey && event.key === "\\") {
    event.preventDefault();
    magicFiller.magicFillAllFields();
    console.log("Autofill Extension: Magic fill shortcut triggered.");
  }
}

document.addEventListener("keydown", handleKeyDown);

/**
 * Handle messages from the popup
 */
chrome.runtime.onMessage.addListener((request: ContentMessage, _sender, sendResponse) => {
  if (request.action === "GET_FIELDS") {
    const allInputs = fieldDetector.getAllInputs();
    const fields: Field[] = [];

    allInputs.forEach((el) => {
      const fieldInfo = fieldDetector.getFieldInfo(el);
      if (fieldInfo) {
        fields.push(fieldInfo);
      }
    });

    sendResponse({ fields });
  } else if (request.action === "FILL_ALL_FIELDS") {
    formFiller.fillAllFields(request.profile).then(() => {
      sendResponse({ status: "success" });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === "MAGIC_FILL") {
    magicFiller.magicFillAllFields();
    sendResponse({ status: "success" });
  }
});
