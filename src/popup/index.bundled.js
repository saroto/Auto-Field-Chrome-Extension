"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/popup/services/popupService.js
  async function getActiveTab() {
    const params = new URLSearchParams(window.location.search);
    const tabIdParam = params.get("tabId");
    if (tabIdParam) {
      try {
        const tab = await chrome.tabs.get(parseInt(tabIdParam, 10));
        if (tab)
          return tab;
      } catch (_) {
      }
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0])
      return tabs[0];
    const allActive = await chrome.tabs.query({ active: true });
    const webTab = allActive.find((t) => t.url && !t.url.startsWith("chrome-extension://") && !t.url.startsWith("chrome://"));
    if (webTab)
      return webTab;
    throw new Error("No active tab found");
  }
  async function getCurrentTabUrl() {
    const tab = await getActiveTab();
    return tab.url || "";
  }
  async function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          reject(new Error("No response from content script"));
        } else {
          resolve(response);
        }
      });
    });
  }
  async function loadFieldsFromTab() {
    const tab = await getActiveTab();
    if (!tab.id) {
      throw new Error("Tab has no ID");
    }
    const response = await sendMessageToTab(tab.id, {
      action: "GET_FIELDS"
    });
    return response.fields;
  }
  async function fillTabFields(profile) {
    const tab = await getActiveTab();
    if (!tab.id) {
      throw new Error("Tab has no ID");
    }
    await sendMessageToTab(tab.id, {
      action: "FILL_ALL_FIELDS",
      profile
    });
  }
  async function magicFillTab() {
    const tab = await getActiveTab();
    if (!tab.id) {
      throw new Error("Tab has no ID");
    }
    await sendMessageToTab(tab.id, {
      action: "MAGIC_FILL"
    });
  }
  async function saveFieldData(data) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(data, resolve);
    });
  }
  async function loadFieldData(keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, resolve);
    });
  }
  async function getAllProfiles() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["profiles"], (result) => {
        resolve(result.profiles || {});
      });
    });
  }
  async function saveAllProfiles(profiles) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ profiles }, resolve);
    });
  }
  async function createProfile(name, url, fields) {
    const profiles = await getAllProfiles();
    const id = `profile_${Date.now()}`;
    const newProfile = {
      id,
      name,
      url,
      createdAt: Date.now(),
      fields
    };
    profiles[id] = newProfile;
    await saveAllProfiles(profiles);
    return newProfile;
  }
  async function deleteProfile(profileId) {
    const profiles = await getAllProfiles();
    delete profiles[profileId];
    await saveAllProfiles(profiles);
    const keysToRemove = [];
    const allData = await new Promise((resolve) => {
      chrome.storage.sync.get(null, resolve);
    });
    for (const key in allData) {
      if (key.startsWith(`autofill_${profileId}_`)) {
        keysToRemove.push(key);
      }
    }
    if (keysToRemove.length > 0) {
      await new Promise((resolve) => {
        chrome.storage.sync.remove(keysToRemove, resolve);
      });
    }
  }
  async function getProfile(profileId) {
    const profiles = await getAllProfiles();
    return profiles[profileId] || null;
  }
  async function saveProfileFieldValues(profileId, fieldValues) {
    const dataToSave = {};
    for (const [fieldName, value] of Object.entries(fieldValues)) {
      dataToSave[`autofill_${profileId}_${fieldName}`] = value;
    }
    await saveFieldData(dataToSave);
  }
  async function loadProfileFieldValues(profileId, fieldNames) {
    const keys = fieldNames.map((name) => `autofill_${profileId}_${name}`);
    const result = await loadFieldData(keys);
    const values = {};
    for (const fieldName of fieldNames) {
      const key = `autofill_${profileId}_${fieldName}`;
      if (result[key]) {
        values[fieldName] = result[key];
      }
    }
    return values;
  }
  async function getActiveProfile() {
    const result = await loadFieldData(["activeProfile"]);
    return result.activeProfile || "";
  }
  async function setActiveProfile(profile) {
    return saveFieldData({ activeProfile: profile });
  }
  var init_popupService = __esm({
    "src/popup/services/popupService.js"() {
      "use strict";
    }
  });

  // src/popup/ui/fieldRenderer.js
  function applySelectStyles(el) {
    el.style.width = "100%";
    el.style.boxSizing = "border-box";
    el.style.padding = "7px 10px";
    el.style.marginTop = "4px";
    el.style.border = "1.5px solid #e2e8f0";
    el.style.borderRadius = "8px";
    el.style.fontSize = "12.5px";
    el.style.color = "#374151";
    el.style.background = "#f8fafc";
    el.style.fontFamily = "inherit";
  }
  function applyInputStyles(el) {
    el.style.width = "100%";
    el.style.boxSizing = "border-box";
    el.style.padding = "7px 10px";
    el.style.marginTop = "4px";
    el.style.border = "1.5px solid #e2e8f0";
    el.style.borderRadius = "8px";
    el.style.fontSize = "12.5px";
    el.style.color = "#374151";
    el.style.background = "#f8fafc";
    el.style.fontFamily = "inherit";
  }
  function makeFieldLabel(text) {
    const label = document.createElement("label");
    label.textContent = text;
    label.style.display = "block";
    label.style.marginTop = "12px";
    label.style.fontSize = "10.5px";
    label.style.color = "#6b7280";
    label.style.fontWeight = "700";
    label.style.textTransform = "uppercase";
    label.style.letterSpacing = "0.5px";
    return label;
  }
  function renderFields(fields, container) {
    container.innerHTML = "";
    if (fields.length === 0) {
      container.innerHTML = '<p class="placeholder-msg">No actionable fields found on this page.</p>';
      return;
    }
    fields.forEach((field) => {
      const wrapper = document.createElement("div");
      const label = makeFieldLabel(field.label || field.name);
      wrapper.appendChild(label);
      if (field.type === "select") {
        const sel = document.createElement("select");
        sel.id = `input_${field.name}`;
        sel.dataset.fieldName = field.name;
        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "-- Select --";
        sel.appendChild(emptyOpt);
        (field.options ?? []).forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt.value;
          o.textContent = opt.label;
          sel.appendChild(o);
        });
        applySelectStyles(sel);
        wrapper.appendChild(sel);
      } else if (field.type === "radio") {
        const groupDiv = document.createElement("div");
        groupDiv.id = `group_${field.name}`;
        groupDiv.style.marginTop = "4px";
        groupDiv.style.padding = "8px 10px";
        groupDiv.style.border = "1.5px solid #e2e8f0";
        groupDiv.style.borderRadius = "8px";
        groupDiv.style.background = "#f8fafc";
        (field.options ?? []).forEach((opt) => {
          const row = document.createElement("label");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "8px";
          row.style.fontSize = "12.5px";
          row.style.padding = "3px 0";
          row.style.cursor = "pointer";
          row.style.width = "100%";
          const rb = document.createElement("input");
          rb.type = "radio";
          rb.name = `popup_${field.name}`;
          rb.dataset.group = field.name;
          rb.dataset.value = opt.value;
          rb.style.flexShrink = "0";
          const span = document.createElement("span");
          span.textContent = opt.label || opt.value;
          span.style.overflow = "hidden";
          span.style.textOverflow = "ellipsis";
          span.style.whiteSpace = "nowrap";
          row.appendChild(rb);
          row.appendChild(span);
          groupDiv.appendChild(row);
        });
        wrapper.appendChild(groupDiv);
      } else if (field.type === "checkbox" && field.options && field.options.length > 1) {
        const groupDiv = document.createElement("div");
        groupDiv.id = `group_${field.name}`;
        groupDiv.style.marginTop = "4px";
        groupDiv.style.padding = "8px 10px";
        groupDiv.style.border = "1.5px solid #e2e8f0";
        groupDiv.style.borderRadius = "8px";
        groupDiv.style.background = "#f8fafc";
        field.options.forEach((opt) => {
          const row = document.createElement("label");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "8px";
          row.style.fontSize = "12.5px";
          row.style.padding = "3px 0";
          row.style.cursor = "pointer";
          row.style.width = "100%";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.dataset.group = field.name;
          cb.dataset.value = opt.value;
          cb.style.flexShrink = "0";
          const span = document.createElement("span");
          span.textContent = opt.label || opt.value;
          span.style.overflow = "hidden";
          span.style.textOverflow = "ellipsis";
          span.style.whiteSpace = "nowrap";
          row.appendChild(cb);
          row.appendChild(span);
          groupDiv.appendChild(row);
        });
        wrapper.appendChild(groupDiv);
      } else if (field.type === "checkbox") {
        const row = document.createElement("label");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "8px";
        row.style.marginTop = "5px";
        row.style.cursor = "pointer";
        row.style.fontSize = "12px";
        row.style.width = "100%";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = `input_${field.name}`;
        cb.dataset.fieldName = field.name;
        cb.style.flexShrink = "0";
        const span = document.createElement("span");
        span.textContent = field.label || field.name;
        row.appendChild(cb);
        row.appendChild(span);
        wrapper.appendChild(row);
      } else {
        const DATE_TYPES = ["date", "time", "datetime-local", "month", "week"];
        const input = document.createElement("input");
        if (DATE_TYPES.includes(field.type)) {
          input.type = field.type;
        } else if (field.type === "email") {
          input.type = "email";
        } else if (field.type === "number" || field.type === "tel") {
          input.type = field.type;
        } else {
          input.type = "text";
        }
        input.id = `input_${field.name}`;
        input.dataset.fieldName = field.name;
        if (!DATE_TYPES.includes(field.type)) {
          input.placeholder = field.placeholder || field.name;
        }
        applyInputStyles(input);
        wrapper.appendChild(input);
      }
      container.appendChild(wrapper);
    });
  }
  var init_fieldRenderer = __esm({
    "src/popup/ui/fieldRenderer.js"() {
      "use strict";
    }
  });

  // src/popup/index.js
  var require_index = __commonJS({
    "src/popup/index.js"() {
      init_popupService();
      init_fieldRenderer();
      document.addEventListener("DOMContentLoaded", async () => {
        const container = document.getElementById("dynamicFieldsContainer");
        const saveBtn = document.getElementById("saveBtn");
        const statusDiv = document.getElementById("status");
        const profileSelect = document.getElementById("profileSelect");
        const allProfilesList = document.getElementById("allProfilesList");
        const profileUrlInfo = document.getElementById("profileUrl");
        const newProfileBtn = document.getElementById("newProfileBtn");
        const deleteProfileBtn = document.getElementById("deleteProfileBtn");
        let activeProfileId = "";
        let currentFields = [];
        let currentUrl = "";
        async function loadFields() {
          try {
            currentUrl = await getCurrentTabUrl();
          } catch (_) {
            currentUrl = "";
          }
          try {
            const fields = await loadFieldsFromTab();
            currentFields = fields;
            renderFields(fields, container);
            await loadProfilesList();
          } catch (error) {
            container.innerHTML = '<p class="placeholder-msg">Open a page with a form and click Reload Fields.</p>';
            console.error("Error loading fields:", error);
            await loadProfilesList();
          }
        }
        async function loadProfilesList() {
          let profiles = await getAllProfiles();
          let profileIds = Object.keys(profiles);
          if (profileIds.length === 0) {
            const defaultProfile = await createProfile("Default Profile", currentUrl, currentFields);
            activeProfileId = defaultProfile.id;
            await setActiveProfile(activeProfileId);
            profiles = await getAllProfiles();
            profileIds = Object.keys(profiles);
          }
          profileSelect.innerHTML = '<option value="">-- Select Profile --</option>';
          if (profileIds.length === 0) {
            allProfilesList.innerHTML = '<p class="placeholder-msg">No profiles saved yet.</p>';
            return;
          }
          profileIds.forEach((id) => {
            const profile = profiles[id];
            if (!profile)
              return;
            const option = document.createElement("option");
            option.value = id;
            option.textContent = profile.name;
            profileSelect.appendChild(option);
          });
          displayAllProfiles(profiles);
          const savedActiveProfile = await getActiveProfile();
          if (savedActiveProfile && profiles[savedActiveProfile]) {
            activeProfileId = savedActiveProfile;
            profileSelect.value = activeProfileId;
            await loadProfileData(activeProfileId);
          }
        }
        function displayAllProfiles(profiles) {
          const profileIds = Object.keys(profiles);
          if (profileIds.length === 0) {
            allProfilesList.innerHTML = '<p class="placeholder-msg">No profiles saved yet.</p>';
            return;
          }
          allProfilesList.innerHTML = "";
          profileIds.forEach((id) => {
            const profile = profiles[id];
            if (!profile)
              return;
            const profileCard = document.createElement("div");
            profileCard.className = "profile-card";
            profileCard.innerHTML = `
        <div class="profile-name"><strong>${profile.name}</strong></div>
        <div class="profile-url"><small>URL: ${profile.url}</small></div>
        <div class="profile-fields"><small>Fields: ${profile.fields.length}</small></div>
      `;
            profileCard.addEventListener("click", () => {
              profileSelect.value = id;
              profileSelect.dispatchEvent(new Event("change"));
            });
            allProfilesList.appendChild(profileCard);
          });
        }
        async function loadProfileData(profileId) {
          const profile = await getProfile(profileId);
          if (!profile) {
            profileUrlInfo.textContent = "-";
            return;
          }
          profileUrlInfo.textContent = profile.url || "N/A";
          if (currentFields.length === 0 && profile.fields.length > 0) {
            renderFields(profile.fields, container);
          }
          clearFieldInputs();
          const fieldsToUse = currentFields.length > 0 ? currentFields : profile.fields;
          const fieldNames = fieldsToUse.map((f) => f.name);
          const savedValues = await loadProfileFieldValues(profileId, fieldNames);
          for (const [fieldName, value] of Object.entries(savedValues)) {
            const field = fieldsToUse.find((f) => f.name === fieldName);
            if (field?.type === "checkbox" && field.options && field.options.length > 1) {
              const checkedValues = value.split(",");
              const checkboxes = container.querySelectorAll(`[data-group="${fieldName}"]`);
              checkboxes.forEach((cb) => {
                cb.checked = checkedValues.includes(cb.dataset.value ?? "");
              });
            } else if (field?.type === "checkbox") {
              const inputEl = document.getElementById(`input_${fieldName}`);
              if (inputEl)
                inputEl.checked = value === "true";
            } else if (field?.type === "radio") {
              const radios = container.querySelectorAll(`[data-group="${fieldName}"]`);
              radios.forEach((rb) => {
                rb.checked = rb.dataset.value === value;
              });
            } else {
              const inputEl = document.getElementById(`input_${fieldName}`);
              if (inputEl)
                inputEl.value = value;
            }
          }
        }
        function showStatus(message, color) {
          statusDiv.textContent = message;
          statusDiv.style.color = color;
          setTimeout(() => {
            statusDiv.textContent = "";
          }, 2e3);
        }
        function clearFieldInputs() {
          container.querySelectorAll("input, select").forEach((el) => {
            if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
              el.checked = false;
            } else {
              el.value = "";
            }
          });
        }
        await loadFields();
        profileSelect.addEventListener("change", async () => {
          activeProfileId = profileSelect.value;
          if (!activeProfileId) {
            container.innerHTML = '<p class="placeholder-msg">Please select a profile.</p>';
            profileUrlInfo.textContent = "-";
            return;
          }
          await setActiveProfile(activeProfileId);
          await loadProfileData(activeProfileId);
        });
        newProfileBtn.addEventListener("click", async () => {
          if (currentFields.length === 0) {
            showStatus("No fields detected on this page!", "red");
            return;
          }
          const profileName = prompt("Enter profile name:");
          if (!profileName) {
            return;
          }
          try {
            const newProfile = await createProfile(profileName, currentUrl, currentFields);
            activeProfileId = newProfile.id;
            await setActiveProfile(activeProfileId);
            await loadProfilesList();
            profileSelect.value = activeProfileId;
            clearFieldInputs();
            showStatus("Profile created!", "#4caf50");
          } catch (error) {
            showStatus("Error creating profile", "red");
            console.error("Error creating profile:", error);
          }
        });
        deleteProfileBtn.addEventListener("click", async () => {
          if (!activeProfileId) {
            showStatus("Please select a profile to delete", "red");
            return;
          }
          if (!confirm("Are you sure you want to delete this profile?")) {
            return;
          }
          try {
            await deleteProfile(activeProfileId);
            activeProfileId = "";
            await loadProfilesList();
            container.innerHTML = '<p class="placeholder-msg">Profile deleted. Select or create a profile.</p>';
            profileUrlInfo.textContent = "-";
            showStatus("Profile deleted!", "#4caf50");
          } catch (error) {
            showStatus("Error deleting profile", "red");
            console.error("Error deleting profile:", error);
          }
        });
        const loadBtn = document.getElementById("loadBtn");
        loadBtn.addEventListener("click", async () => {
          await loadFields();
          showStatus("Fields reloaded!", "#6366f1");
        });
        saveBtn.addEventListener("click", async () => {
          if (!activeProfileId) {
            showStatus("Please select a profile first", "red");
            return;
          }
          const fieldValues = {};
          currentFields.forEach((field) => {
            if (field.type === "checkbox" && field.options && field.options.length > 1) {
              const checkboxes = container.querySelectorAll(`[data-group="${field.name}"]`);
              const checked = Array.from(checkboxes).filter((cb) => cb.checked).map((cb) => cb.dataset.value ?? "");
              fieldValues[field.name] = checked.join(",");
            } else if (field.type === "checkbox") {
              const inputEl = document.getElementById(`input_${field.name}`);
              if (inputEl)
                fieldValues[field.name] = String(inputEl.checked);
            } else if (field.type === "radio") {
              const checked = container.querySelector(`[data-group="${field.name}"]:checked`);
              fieldValues[field.name] = checked?.dataset.value ?? "";
            } else {
              const inputEl = document.getElementById(`input_${field.name}`);
              if (inputEl)
                fieldValues[field.name] = inputEl.value;
            }
          });
          try {
            await saveProfileFieldValues(activeProfileId, fieldValues);
            await fillTabFields(activeProfileId);
            showStatus("Saved & filled!", "#4caf50");
          } catch (error) {
            showStatus("Error saving / filling", "red");
            console.error("Error saving field data:", error);
          }
        });
        const magicFillBtn = document.getElementById("magicFillBtn");
        magicFillBtn.addEventListener("click", async () => {
          try {
            await magicFillTab();
            showStatus("Magic Filled with Fake Data!", "#9c27b0");
          } catch (error) {
            showStatus("Error: Could not perform magic fill.", "red");
            console.error("Error in magic fill:", error);
          }
        });
      });
    }
  });
  require_index();
})();
