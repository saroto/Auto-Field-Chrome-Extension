"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/shared/constants.js
  var STORAGE_KEY_PREFIX;
  var init_constants = __esm({
    "src/shared/constants.js"() {
      "use strict";
      STORAGE_KEY_PREFIX = "autofill";
    }
  });

  // src/popup/services/popupService.js
  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      throw new Error("No active tab found");
    }
    return tabs[0];
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
  async function getActiveProfile() {
    const result = await loadFieldData(["activeProfile"]);
    return result.activeProfile || "Profile1";
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
  function renderFields(fields, container) {
    container.innerHTML = "";
    if (fields.length === 0) {
      container.innerHTML = '<div style="font-size: 12px; color: #888;">No actionable fields found on this page.</div>';
      return;
    }
    fields.forEach((field) => {
      const label = document.createElement("label");
      label.htmlFor = `input_${field.name}`;
      label.textContent = field.label ? `Field: ${field.label}` : `Field: ${field.name}`;
      label.style.display = "block";
      label.style.marginTop = "10px";
      label.style.fontSize = "12px";
      label.style.color = "#666";
      let input;
      if (field.type === "select") {
        input = document.createElement("select");
        input.id = `input_${field.name}`;
        input.dataset.fieldName = field.name;
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
  function loadSavedValues(fields, profile, container) {
    const keysToLoad = fields.map((f) => `${STORAGE_KEY_PREFIX}_${profile}_${f.name}`);
    chrome.storage.sync.get(keysToLoad, (result) => {
      fields.forEach((field) => {
        const inputEl = container.querySelector(`#input_${field.name}`);
        if (inputEl && result[`${STORAGE_KEY_PREFIX}_${profile}_${field.name}`]) {
          inputEl.value = result[`${STORAGE_KEY_PREFIX}_${profile}_${field.name}`];
        }
      });
    });
  }
  var init_fieldRenderer = __esm({
    "src/popup/ui/fieldRenderer.js"() {
      "use strict";
      init_constants();
    }
  });

  // src/popup/index.js
  var require_index = __commonJS({
    "src/popup/index.js"() {
      init_constants();
      init_popupService();
      init_fieldRenderer();
      document.addEventListener("DOMContentLoaded", async () => {
        const container = document.getElementById("dynamicFieldsContainer");
        const saveBtn = document.getElementById("saveBtn");
        const statusDiv = document.getElementById("status");
        const fieldCountEl = document.getElementById("fieldCount");
        const profileSelect = document.getElementById("profileSelect");
        let activeProfile = "Profile1";
        let currentFields = [];
        async function loadFields() {
          try {
            container.innerHTML = '<div class="message">Detecting fields on page...</div>';
            const fields = await loadFieldsFromTab();
            currentFields = fields;
            fieldCountEl.textContent = currentFields.length.toString();
            renderFields(fields, container);
            loadSavedValues(fields, activeProfile, container);
          } catch (error) {
            container.innerHTML = '<div class="message">No actionable fields detected or extension not injected (e.g. chrome:// page).</div>';
            fieldCountEl.textContent = "0";
            console.error("Error loading fields:", error);
          }
        }
        try {
          activeProfile = await getActiveProfile();
          profileSelect.value = activeProfile;
        } catch (error) {
          console.error("Error getting active profile:", error);
        }
        loadFields();
        profileSelect.addEventListener("change", async () => {
          activeProfile = profileSelect.value;
          try {
            await setActiveProfile(activeProfile);
            container.innerHTML = '<div class="message">Switching profile...</div>';
            loadFields();
          } catch (error) {
            console.error("Error changing profile:", error);
          }
        });
        const loadBtn = document.getElementById("loadBtn");
        loadBtn.addEventListener("click", () => {
          loadFields();
          statusDiv.textContent = "Fields reloaded!";
          statusDiv.style.color = "#FF9800";
          setTimeout(() => {
            statusDiv.textContent = "";
          }, 2e3);
        });
        saveBtn.addEventListener("click", async () => {
          const dataToSave = {};
          currentFields.forEach((field) => {
            const inputEl = document.getElementById(`input_${field.name}`);
            if (inputEl) {
              dataToSave[`${STORAGE_KEY_PREFIX}_${activeProfile}_${field.name}`] = inputEl.value;
            }
          });
          try {
            await saveFieldData(dataToSave);
            statusDiv.textContent = "Settings saved!";
            statusDiv.style.color = "#4caf50";
            setTimeout(() => {
              statusDiv.textContent = "";
            }, 2e3);
          } catch (error) {
            statusDiv.textContent = "Error saving settings";
            statusDiv.style.color = "red";
            console.error("Error saving field data:", error);
          }
        });
        const fillAllBtn = document.getElementById("fillAllBtn");
        fillAllBtn.addEventListener("click", async () => {
          try {
            await fillTabFields(activeProfile);
            statusDiv.textContent = "All possible fields filled!";
            statusDiv.style.color = "#2196F3";
          } catch (error) {
            statusDiv.textContent = "Error: Could not fill fields.";
            statusDiv.style.color = "red";
            console.error("Error filling fields:", error);
          }
          setTimeout(() => {
            statusDiv.textContent = "";
          }, 2e3);
        });
        const magicFillBtn = document.getElementById("magicFillBtn");
        magicFillBtn.addEventListener("click", async () => {
          try {
            await magicFillTab();
            statusDiv.textContent = "Magic Filled with Fake Data!";
            statusDiv.style.color = "#9c27b0";
          } catch (error) {
            statusDiv.textContent = "Error: Could not perform magic fill.";
            statusDiv.style.color = "red";
            console.error("Error in magic fill:", error);
          }
          setTimeout(() => {
            statusDiv.textContent = "";
          }, 2e3);
        });
      });
    }
  });
  require_index();
})();
