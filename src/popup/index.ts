// src/popup/index.ts

import { STORAGE_KEY_PREFIX } from "../shared/constants.js";
import * as popupService from "./services/popupService.js";
import * as fieldRenderer from "./ui/fieldRenderer.js";

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById(
    "dynamicFieldsContainer",
  ) as HTMLDivElement;
  const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
  const statusDiv = document.getElementById("status") as HTMLDivElement;
  const fieldCountEl = document.getElementById("fieldCount") as HTMLElement;
  const profileSelect = document.getElementById(
    "profileSelect",
  ) as HTMLSelectElement;

  let activeProfile = "Profile1";
  let currentFields: any[] = [];

  async function loadFields() {
    try {
      container.innerHTML =
        '<div class="message">Detecting fields on page...</div>';

      const fields = await popupService.loadFieldsFromTab();
      currentFields = fields;
      fieldCountEl.textContent = currentFields.length.toString();

      fieldRenderer.renderFields(fields, container);
      fieldRenderer.loadSavedValues(fields, activeProfile, container);
    } catch (error) {
      container.innerHTML =
        '<div class="message">No actionable fields detected or extension not injected (e.g. chrome:// page).</div>';
      fieldCountEl.textContent = "0";
      console.error("Error loading fields:", error);
    }
  }

  // Initialize profile from storage
  try {
    activeProfile = await popupService.getActiveProfile();
    profileSelect.value = activeProfile;
  } catch (error) {
    console.error("Error getting active profile:", error);
  }

  loadFields();

  profileSelect.addEventListener("change", async () => {
    activeProfile = profileSelect.value;
    try {
      await popupService.setActiveProfile(activeProfile);
      container.innerHTML =
        '<div class="message">Switching profile...</div>';
      loadFields();
    } catch (error) {
      console.error("Error changing profile:", error);
    }
  });

  const loadBtn = document.getElementById("loadBtn") as HTMLButtonElement;
  loadBtn.addEventListener("click", () => {
    loadFields();
    statusDiv.textContent = "Fields reloaded!";
    statusDiv.style.color = "#FF9800";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 2000);
  });

  saveBtn.addEventListener("click", async () => {
    const dataToSave: Record<string, string> = {};
    currentFields.forEach((field) => {
      const inputEl = document.getElementById(
        `input_${field.name}`,
      ) as HTMLInputElement;
      if (inputEl) {
        dataToSave[`${STORAGE_KEY_PREFIX}_${activeProfile}_${field.name}`] = inputEl.value;
      }
    });

    try {
      await popupService.saveFieldData(dataToSave);
      statusDiv.textContent = "Settings saved!";
      statusDiv.style.color = "#4caf50";
      setTimeout(() => {
        statusDiv.textContent = "";
      }, 2000);
    } catch (error) {
      statusDiv.textContent = "Error saving settings";
      statusDiv.style.color = "red";
      console.error("Error saving field data:", error);
    }
  });

  const fillAllBtn = document.getElementById("fillAllBtn") as HTMLButtonElement;
  fillAllBtn.addEventListener("click", async () => {
    try {
      await popupService.fillTabFields(activeProfile);
      statusDiv.textContent = "All possible fields filled!";
      statusDiv.style.color = "#2196F3";
    } catch (error) {
      statusDiv.textContent = "Error: Could not fill fields.";
      statusDiv.style.color = "red";
      console.error("Error filling fields:", error);
    }
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 2000);
  });

  const magicFillBtn = document.getElementById(
    "magicFillBtn",
  ) as HTMLButtonElement;
  magicFillBtn.addEventListener("click", async () => {
    try {
      await popupService.magicFillTab();
      statusDiv.textContent = "Magic Filled with Fake Data!";
      statusDiv.style.color = "#9c27b0";
    } catch (error) {
      statusDiv.textContent = "Error: Could not perform magic fill.";
      statusDiv.style.color = "red";
      console.error("Error in magic fill:", error);
    }
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 2000);
  });
});
