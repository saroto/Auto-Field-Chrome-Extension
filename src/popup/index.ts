// src/popup/index.ts

import { Field, Profile } from "../shared/types.js";
import * as popupService from "./services/popupService.js";
import * as fieldRenderer from "./ui/fieldRenderer.js";

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById(
    "dynamicFieldsContainer",
  ) as HTMLDivElement;
  const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
  const statusDiv = document.getElementById("status") as HTMLDivElement;
  const profileSelect = document.getElementById(
    "profileSelect",
  ) as HTMLSelectElement;
  const allProfilesList = document.getElementById(
    "allProfilesList",
  ) as HTMLDivElement;
  const profileUrlInfo = document.getElementById(
    "profileUrl",
  ) as HTMLSpanElement;
  const newProfileBtn = document.getElementById(
    "newProfileBtn",
  ) as HTMLButtonElement;
  const deleteProfileBtn = document.getElementById(
    "deleteProfileBtn",
  ) as HTMLButtonElement;

  let activeProfileId = "";
  let currentFields: Field[] = [];
  let currentUrl = "";

  /**
   * Load available fields from current page
   */
  async function loadFields(skipRestore = false) {
    try {
      currentUrl = await popupService.getCurrentTabUrl();
    } catch (_) {
      currentUrl = "";
    }

    try {
      const fields = await popupService.loadFieldsFromTab();
      currentFields = fields;
      fieldRenderer.renderFields(fields, container);
      await loadProfilesList(skipRestore);
    } catch (error) {
      container.innerHTML =
        '<p class="placeholder-msg">Open a page with a form and click Reload Fields.</p>';
      console.error("Error loading fields:", error);
      await loadProfilesList(skipRestore);
    }
  }

  /**
   * Load and display all profiles
   */
  async function loadProfilesList(skipRestore = false) {
    let profiles = await popupService.getAllProfiles();
    let profileIds = Object.keys(profiles);

    // Auto-create a Default Profile if none exist
    if (profileIds.length === 0) {
      const defaultProfile = await popupService.createProfile(
        "Default Profile",
        currentUrl,
        currentFields,
      );
      activeProfileId = defaultProfile.id;
      await popupService.setActiveProfile(activeProfileId);
      profiles = await popupService.getAllProfiles();
      profileIds = Object.keys(profiles);
    }

    // Update profile select dropdown
    profileSelect.innerHTML = '<option value="">-- Select Profile --</option>';

    if (profileIds.length === 0) {
      allProfilesList.innerHTML =
        '<p class="placeholder-msg">No profiles saved yet.</p>';
      return;
    }

    profileIds.forEach((id) => {
      const profile = profiles[id];
      if (!profile) return;
      const option = document.createElement("option");
      option.value = id;
      option.textContent = profile.name;
      profileSelect.appendChild(option);
    });

    // Display all profiles with URLs
    displayAllProfiles(profiles);

    // Restore active profile, or auto-select one matching current URL
    const savedActiveProfile = await popupService.getActiveProfile();
    let selectedProfile = "";

    if (savedActiveProfile && profiles[savedActiveProfile]) {
      selectedProfile = savedActiveProfile;
    }

    // If no active profile or it doesn't match current URL, try to find one that does
    if (currentUrl && (!selectedProfile || !profiles[selectedProfile]?.url || !currentUrl.startsWith(profiles[selectedProfile]?.url ?? ""))) {
      const urlMatch = profileIds.find((id) => {
        const p = profiles[id];
        return p?.url && currentUrl.startsWith(p.url);
      });
      if (urlMatch) selectedProfile = urlMatch;
    }

    if (selectedProfile) {
      activeProfileId = selectedProfile;
      profileSelect.value = activeProfileId;
      await popupService.setActiveProfile(activeProfileId);
      if (!skipRestore) {
        await loadProfileData(activeProfileId);
      }
    }
  }

  /**
   * Display all profiles with their URLs
   */
  function displayAllProfiles(profiles: { [key: string]: Profile }) {
    const profileIds = Object.keys(profiles);

    if (profileIds.length === 0) {
      allProfilesList.innerHTML =
        '<p class="placeholder-msg">No profiles saved yet.</p>';
      return;
    }

    allProfilesList.innerHTML = "";

    profileIds.forEach((id) => {
      const profile = profiles[id];
      if (!profile) return;
      const profileCard = document.createElement("div");
      profileCard.className = "profile-card";

      const nameDiv = document.createElement("div");
      nameDiv.className = "profile-name";
      const strong = document.createElement("strong");
      strong.textContent = profile.name;
      nameDiv.appendChild(strong);

      const urlDiv = document.createElement("div");
      urlDiv.className = "profile-url";
      const urlSmall = document.createElement("small");
      urlSmall.textContent = `URL: ${profile.url}`;
      urlDiv.appendChild(urlSmall);

      const fieldsDiv = document.createElement("div");
      fieldsDiv.className = "profile-fields";
      const fieldsSmall = document.createElement("small");
      fieldsSmall.textContent = `Fields: ${profile.fields.length}`;
      fieldsDiv.appendChild(fieldsSmall);

      profileCard.appendChild(nameDiv);
      profileCard.appendChild(urlDiv);
      profileCard.appendChild(fieldsDiv);

      // Click to select this profile
      profileCard.addEventListener("click", () => {
        profileSelect.value = id;
        profileSelect.dispatchEvent(new Event("change"));
      });

      allProfilesList.appendChild(profileCard);
    });
  }

  /**
   * Load profile data into form fields (overlay saved values, re-render if no live fields)
   */
  async function loadProfileData(profileId: string) {
    const profile = await popupService.getProfile(profileId);

    if (!profile) {
      profileUrlInfo.textContent = "-";
      return;
    }

    // Display profile URL
    profileUrlInfo.textContent = profile.url || "N/A";

    // If the page has no live fields, fall back to profile's stored fields
    if (currentFields.length === 0 && profile.fields.length > 0) {
      fieldRenderer.renderFields(profile.fields, container);
    }

    // Clear all inputs first so fields not saved in this profile appear blank
    clearFieldInputs();

    // Load saved values and populate inputs
    const fieldsToUse =
      currentFields.length > 0 ? currentFields : profile.fields;
    const fieldNames = fieldsToUse.map((f) => f.name);
    const savedValues = await popupService.loadProfileFieldValues(
      profileId,
      fieldNames,
    );

    for (const [fieldName, value] of Object.entries(savedValues)) {
      const field = fieldsToUse.find((f) => f.name === fieldName);
      if (
        field?.type === "checkbox" &&
        field.options &&
        field.options.length > 1
      ) {
        // Restore checkbox group
        const checkedValues = value.split(",");
        const checkboxes = container.querySelectorAll<HTMLInputElement>(
          `[data-group="${fieldName}"]`,
        );
        checkboxes.forEach((cb) => {
          cb.checked = checkedValues.includes(cb.dataset.value ?? "");
        });
      } else if (field?.type === "checkbox") {
        // Restore single checkbox
        const inputEl = document.getElementById(
          `input_${fieldName}`,
        ) as HTMLInputElement;
        if (inputEl) inputEl.checked = value === "true";
      } else if (field?.type === "radio") {
        // Restore radio group: check the matching option
        const radios = container.querySelectorAll<HTMLInputElement>(
          `[data-group="${fieldName}"]`,
        );
        radios.forEach((rb) => {
          rb.checked = rb.dataset.value === value;
        });
      } else {
        const inputEl = document.getElementById(
          `input_${fieldName}`,
        ) as HTMLInputElement;
        if (inputEl) inputEl.value = value;
      }
    }
  }

  /**
   * Show status message
   */
  function showStatus(message: string, color: string) {
    statusDiv.textContent = message;
    statusDiv.style.color = color;
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 3500);
  }

  /**
   * Clear all field inputs in the container (used when switching to a fresh profile)
   */
  function clearFieldInputs() {
    container
      .querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")
      .forEach((el) => {
        if (
          el instanceof HTMLInputElement &&
          (el.type === "checkbox" || el.type === "radio")
        ) {
          el.checked = false;
        } else {
          el.value = "";
        }
      });
  }

  // Initialize
  await loadFields();

  // Profile select change
  profileSelect.addEventListener("change", async () => {
    activeProfileId = profileSelect.value;

    if (!activeProfileId) {
      container.innerHTML =
        '<p class="placeholder-msg">Please select a profile.</p>';
      profileUrlInfo.textContent = "-";
      return;
    }

    await popupService.setActiveProfile(activeProfileId);
    await loadProfileData(activeProfileId);
  });

  // New profile button
  newProfileBtn.addEventListener("click", async () => {
    if (currentFields.length === 0) {
      showStatus("No fields detected on this page!", "red");
      return;
    }

    const rawName = prompt("Enter profile name:");
    if (!rawName) {
      return;
    }
    const profileName = rawName.trim().substring(0, 50);
    if (!profileName) {
      showStatus("Profile name cannot be empty", "red");
      return;
    }

    try {
      const newProfile = await popupService.createProfile(
        profileName,
        currentUrl,
        currentFields,
      );
      activeProfileId = newProfile.id;
      await popupService.setActiveProfile(activeProfileId);
      await loadProfilesList();
      profileSelect.value = activeProfileId;
      // Clear all inputs so the new profile starts blank
      clearFieldInputs();
      showStatus("Profile created!", "#4caf50");
    } catch (error) {
      showStatus("Error creating profile", "red");
      console.error("Error creating profile:", error);
    }
  });

  // Delete profile button
  deleteProfileBtn.addEventListener("click", async () => {
    if (!activeProfileId) {
      showStatus("Please select a profile to delete", "red");
      return;
    }

    if (!confirm("Are you sure you want to delete this profile?")) {
      return;
    }

    try {
      await popupService.deleteProfile(activeProfileId);
      activeProfileId = "";
      await loadProfilesList();
      container.innerHTML =
        '<p class="placeholder-msg">Profile deleted. Select or create a profile.</p>';
      profileUrlInfo.textContent = "-";
      showStatus("Profile deleted!", "#4caf50");
    } catch (error) {
      showStatus("Error deleting profile", "red");
      console.error("Error deleting profile:", error);
    }
  });

  // Reload fields button
  const loadBtn = document.getElementById("loadBtn") as HTMLButtonElement;
  loadBtn.addEventListener("click", async () => {
    clearFieldInputs();
    await loadFields(true);
    showStatus("Fields reloaded!", "#6366f1");
  });

  // Save button
  saveBtn.addEventListener("click", async () => {
    if (!activeProfileId) {
      showStatus("Please select a profile first", "red");
      return;
    }

    const fieldValues: Record<string, string> = {};
    currentFields.forEach((field) => {
      if (
        field.type === "checkbox" &&
        field.options &&
        field.options.length > 1
      ) {
        // Checkbox group: collect checked values as comma-separated string
        const checkboxes = container.querySelectorAll<HTMLInputElement>(
          `[data-group="${CSS.escape(field.name)}"]`,
        );
        const checked = Array.from(checkboxes)
          .filter((cb) => cb.checked)
          .map((cb) => cb.dataset.value ?? "");
        fieldValues[field.name] = checked.join(",");
      } else if (field.type === "checkbox") {
        const inputEl = document.getElementById(
          `input_${CSS.escape(field.name)}`,
        ) as HTMLInputElement;
        if (inputEl) fieldValues[field.name] = String(inputEl.checked);
      } else if (field.type === "radio") {
        // Radio group: get the checked radio's value
        const checked = container.querySelector<HTMLInputElement>(
          `[data-group="${CSS.escape(field.name)}"]:checked`,
        );
        fieldValues[field.name] = checked?.dataset.value ?? "";
      } else {
        const inputEl = document.getElementById(
          `input_${CSS.escape(field.name)}`,
        ) as HTMLInputElement;
        if (inputEl) fieldValues[field.name] = inputEl.value;
      }
    });

    try {
      await popupService.saveProfileFieldValues(activeProfileId, fieldValues);
      // Also fill the form immediately after saving
      await popupService.fillTabFields(activeProfileId);
      showStatus("Saved & filled!", "#4caf50");
    } catch (error) {
      showStatus("Error saving / filling", "red");
      console.error("Error saving field data:", error);
    }
  });

  // Export button
  const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement;
  exportBtn.addEventListener("click", async () => {
    try {
      const data = await popupService.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autofill-profiles-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus("Profiles exported!", "#4caf50");
    } catch (error) {
      showStatus("Error exporting profiles", "red");
      console.error("Export error:", error);
    }
  });

  // Import button
  const importBtn = document.getElementById("importBtn") as HTMLButtonElement;
  const importFile = document.getElementById("importFile") as HTMLInputElement;
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const count = await popupService.importAllData(data);
      await loadProfilesList(true);
      showStatus(`Imported ${count} profile(s)!`, "#4caf50");
    } catch (error) {
      showStatus("Error importing: invalid file", "red");
      console.error("Import error:", error);
    }
    importFile.value = "";
  });

  // Magic fill button
  const magicFillBtn = document.getElementById(
    "magicFillBtn",
  ) as HTMLButtonElement;
  magicFillBtn.addEventListener("click", async () => {
    try {
      await popupService.magicFillTab();
      showStatus("Magic Filled with Fake Data!", "#9c27b0");
    } catch (error) {
      showStatus("Error: Could not perform magic fill.", "red");
      console.error("Error in magic fill:", error);
    }
  });
});
