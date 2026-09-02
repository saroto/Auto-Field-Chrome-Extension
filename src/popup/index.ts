// src/popup/index.ts

import { Field, Profile } from "../shared/types.js";
import * as popupService from "./services/popupService.js";
import * as fieldRenderer from "./ui/fieldRenderer.js";

type StatusTone = "ok" | "error" | "info" | "magic";

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
  const fieldFilter = document.getElementById(
    "fieldFilter",
  ) as HTMLInputElement;
  const fieldCount = document.getElementById("fieldCount") as HTMLSpanElement;
  const fieldScope = document.getElementById("fieldScope") as HTMLSpanElement;
  const profileCount = document.getElementById(
    "profileCount",
  ) as HTMLSpanElement;

  let activeProfileId = "";
  let currentFields: Field[] = [];
  // What is actually on screen. Usually the page's live fields, but falls back
  // to the profile's stored fields when the page has none. Save and restore
  // both read this — reading different lists is how typed values got dropped.
  let renderedFields: Field[] = [];
  let currentUrl = "";

  /**
   * Replace a container's contents with a single empty-state message
   */
  function showPlaceholder(target: HTMLElement, message: string) {
    target.textContent = "";
    const p = document.createElement("p");
    p.className = "placeholder-msg";
    p.textContent = message;
    target.appendChild(p);
  }

  /**
   * Keep the Fields section header in sync: count badge + filter visibility
   */
  function updateFieldsHeader(count: number) {
    fieldCount.textContent = count > 0 ? String(count) : "";
    fieldFilter.hidden = count <= 8;
    if (fieldFilter.hidden) fieldFilter.value = "";
    applyFieldFilter();
  }

  /**
   * Hide field rows that don't match what's typed in the filter box
   */
  function applyFieldFilter() {
    const query = fieldFilter.value.trim().toLowerCase();
    container.querySelectorAll<HTMLElement>(".field").forEach((row) => {
      row.hidden = query !== "" && !(row.dataset.search ?? "").includes(query);
    });
  }

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
      const { fields, inDialog } = await popupService.loadFieldsFromTab();
      currentFields = fields;
      renderedFields = fields;
      fieldScope.hidden = !inDialog;
      fieldRenderer.renderFields(fields, container);
      updateFieldsHeader(fields.length);
      await loadProfilesList(skipRestore);
    } catch (error) {
      currentFields = [];
      renderedFields = [];
      fieldScope.hidden = true;
      showPlaceholder(
        container,
        error instanceof popupService.PageNotSupportedError
          ? error.message
          : "Can't read this page. Open a page with a form, then rescan.",
      );
      updateFieldsHeader(0);
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
    profileSelect.textContent = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Select a profile";
    profileSelect.appendChild(emptyOption);

    profileCount.textContent =
      profileIds.length > 0 ? String(profileIds.length) : "";

    if (profileIds.length === 0) {
      showPlaceholder(
        allProfilesList,
        "No profiles yet. Create one to save what you type here.",
      );
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
    if (
      currentUrl &&
      (!selectedProfile ||
        !profiles[selectedProfile]?.url ||
        !currentUrl.startsWith(profiles[selectedProfile]?.url ?? ""))
    ) {
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
      markActiveProfileCard();
      if (!skipRestore) {
        await loadProfileData(activeProfileId);
      }
    }
  }

  /**
   * Highlight whichever saved-profile card is currently selected
   */
  function markActiveProfileCard() {
    allProfilesList
      .querySelectorAll<HTMLElement>(".profile-card")
      .forEach((card) => {
        const isActive = card.dataset.profileId === activeProfileId;
        card.classList.toggle("is-active", isActive);
        card.setAttribute("aria-pressed", String(isActive));
      });
  }

  /**
   * Display all profiles with their URLs
   */
  function displayAllProfiles(profiles: { [key: string]: Profile }) {
    const profileIds = Object.keys(profiles);

    if (profileIds.length === 0) {
      showPlaceholder(
        allProfilesList,
        "No profiles yet. Create one to save what you type here.",
      );
      return;
    }

    allProfilesList.textContent = "";

    profileIds.forEach((id) => {
      const profile = profiles[id];
      if (!profile) return;

      const profileCard = document.createElement("button");
      profileCard.type = "button";
      profileCard.className = "profile-card";
      profileCard.dataset.profileId = id;

      const nameDiv = document.createElement("div");
      nameDiv.className = "profile-name";
      nameDiv.textContent = profile.name;

      const meta = document.createElement("div");
      meta.className = "profile-meta";

      const urlSpan = document.createElement("span");
      urlSpan.className = "profile-url";
      urlSpan.textContent = profile.url || "any page";
      urlSpan.title = profile.url || "any page";

      const countSpan = document.createElement("span");
      countSpan.className = "profile-count";
      countSpan.textContent = `${profile.fields.length} fields`;

      meta.appendChild(urlSpan);
      meta.appendChild(countSpan);

      profileCard.appendChild(nameDiv);
      profileCard.appendChild(meta);

      // Click to select this profile
      profileCard.addEventListener("click", () => {
        profileSelect.value = id;
        profileSelect.dispatchEvent(new Event("change"));
      });

      allProfilesList.appendChild(profileCard);
    });

    markActiveProfileCard();
  }

  /**
   * Load profile data into form fields (overlay saved values, re-render if no live fields)
   */
  async function loadProfileData(profileId: string) {
    const profile = await popupService.getProfile(profileId);

    if (!profile) {
      profileUrlInfo.textContent = "Not set";
      return;
    }

    // Display profile URL
    profileUrlInfo.textContent = profile.url || "Any page";

    // If the page has no live fields, fall back to profile's stored fields
    if (currentFields.length === 0 && profile.fields.length > 0) {
      fieldRenderer.renderFields(profile.fields, container);
      updateFieldsHeader(profile.fields.length);
      renderedFields = profile.fields;
    }

    // Clear all inputs first so fields not saved in this profile appear blank
    clearFieldInputs();

    // Load saved values and populate inputs
    const fieldsToUse = renderedFields;
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
          `[data-group="${CSS.escape(fieldName)}"]`,
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
          `[data-group="${CSS.escape(fieldName)}"]`,
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
   * Show a toast above the action bar. Fades out on its own; no layout shift.
   */
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  function showStatus(message: string, tone: StatusTone = "info") {
    statusDiv.textContent = message;
    statusDiv.className = `is-visible is-${tone}`;
    statusDiv.title = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      statusDiv.className = `is-${tone}`;
    }, 3000);
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

  // Field filter
  fieldFilter.addEventListener("input", applyFieldFilter);

  // Profile select change
  profileSelect.addEventListener("change", async () => {
    activeProfileId = profileSelect.value;
    markActiveProfileCard();

    if (!activeProfileId) {
      // Keep the detected fields on screen — they belong to the page, not the
      // profile — but drop the values that came from the profile we just left.
      clearFieldInputs();
      profileUrlInfo.textContent = "Not set";
      return;
    }

    await popupService.setActiveProfile(activeProfileId);
    await loadProfileData(activeProfileId);
  });

  // New profile button
  newProfileBtn.addEventListener("click", async () => {
    if (currentFields.length === 0) {
      showStatus("No fields on this page to save", "error");
      return;
    }

    const rawName = prompt("Name this profile:");
    if (!rawName) {
      return;
    }
    const profileName = rawName.trim().substring(0, 50);
    if (!profileName) {
      showStatus("A profile needs a name", "error");
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
      markActiveProfileCard();
      // Clear all inputs so the new profile starts blank
      clearFieldInputs();
      showStatus(`Created ${profileName}`, "ok");
    } catch (error) {
      showStatus("Couldn't create the profile", "error");
      console.error("Error creating profile:", error);
    }
  });

  // Delete profile button
  deleteProfileBtn.addEventListener("click", async () => {
    if (!activeProfileId) {
      showStatus("Select a profile to delete", "error");
      return;
    }

    const profile = await popupService.getProfile(activeProfileId);
    const name = profile?.name ?? "this profile";
    if (!confirm(`Delete "${name}" and everything saved in it?`)) {
      return;
    }

    try {
      await popupService.deleteProfile(activeProfileId);
      activeProfileId = "";
      clearFieldInputs();
      await loadProfilesList();
      profileUrlInfo.textContent = "Not set";
      showStatus(`Deleted ${name}`, "ok");
    } catch (error) {
      showStatus("Couldn't delete the profile", "error");
      console.error("Error deleting profile:", error);
    }
  });

  // Rescan page button
  const loadBtn = document.getElementById("loadBtn") as HTMLButtonElement;
  loadBtn.addEventListener("click", async () => {
    clearFieldInputs();
    await loadFields(true);
    const n = currentFields.length;
    const where = fieldScope.hidden ? "" : " in the dialog";
    showStatus(
      n === 0
        ? `No fields found${where || " here"}`
        : `Found ${n} field${n === 1 ? "" : "s"}${where}`,
      n === 0 ? "error" : "info",
    );
  });

  // Save button
  saveBtn.addEventListener("click", async () => {
    if (!activeProfileId) {
      showStatus("Select a profile first", "error");
      return;
    }

    if (renderedFields.length === 0) {
      showStatus("No fields to save yet — rescan the page", "error");
      return;
    }

    const fieldValues: Record<string, string> = {};
    renderedFields.forEach((field) => {
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
        // getElementById takes a raw id, not a selector — escaping it here
        // would miss any field name containing ".", "[", ":" and friends.
        const inputEl = document.getElementById(
          `input_${field.name}`,
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
          `input_${field.name}`,
        ) as HTMLInputElement;
        if (inputEl) fieldValues[field.name] = inputEl.value;
      }
    });

    try {
      await popupService.saveProfileFieldValues(activeProfileId, fieldValues);
      // Also fill the form immediately after saving
      await popupService.fillTabFields(activeProfileId);
      showStatus("Saved and filled", "ok");
    } catch (error) {
      showStatus("Couldn't save or fill", "error");
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
      showStatus("Exported to your downloads", "ok");
    } catch (error) {
      showStatus("Couldn't export profiles", "error");
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
      showStatus(
        `Imported ${count} profile${count === 1 ? "" : "s"}`,
        "ok",
      );
    } catch (error) {
      showStatus("That file isn't a profile export", "error");
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
      showStatus("Filled with test data", "magic");
    } catch (error) {
      showStatus("Couldn't fill this page", "error");
      console.error("Error in magic fill:", error);
    }
  });
});
