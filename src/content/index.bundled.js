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
  var IGNORED_INPUT_TYPES, MAGIC_FILL_BG_COLOR, STORAGE_KEY_PREFIX;
  var init_constants = __esm({
    "src/shared/constants.js"() {
      "use strict";
      IGNORED_INPUT_TYPES = [
        "submit",
        "button",
        "file",
        "image",
        "reset"
      ];
      MAGIC_FILL_BG_COLOR = "#f3e5f5";
      STORAGE_KEY_PREFIX = "autofill";
    }
  });

  // src/content/ui/toggleButton.js
  function createToggleButton() {
    if (toggleButton)
      return toggleButton;
    toggleButton = document.createElement("div");
    toggleButton.className = "autofill-extension-toggle";
    toggleButton.addEventListener("mousedown", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!activeInput) {
        console.warn("Autofill Extension: No active input found when toggle was clicked.");
        return;
      }
      const nameAttr = activeInput.name || activeInput.id;
      if (!nameAttr) {
        console.warn("Autofill Extension: Active input has no name or id attribute.");
        return;
      }
      const activeProfileData = await chrome.storage.sync.get("activeProfile");
      const activeProfile = activeProfileData.activeProfile || "Profile1";
      const storageKey = `${STORAGE_KEY_PREFIX}_${activeProfile}_${nameAttr}`;
      const data = await chrome.storage.sync.get(storageKey);
      if (data[storageKey] !== void 0) {
        setTimeout(() => {
          if (activeInput) {
            activeInput.value = data[storageKey];
            activeInput.dispatchEvent(new Event("input", { bubbles: true }));
            activeInput.dispatchEvent(new Event("change", { bubbles: true }));
            console.log(`Autofill Extension: Filled ${nameAttr} with saved data.`);
            hide();
          }
        }, 10);
      } else {
        console.warn(`Autofill Extension: No saved data found for key ${storageKey}.`);
      }
    });
    document.body.appendChild(toggleButton);
    return toggleButton;
  }
  function show(input) {
    activeInput = input;
    const btn = createToggleButton();
    const rect = input.getBoundingClientRect();
    btn.style.position = "fixed";
    btn.style.top = `${rect.top + rect.height / 2 - 12}px`;
    btn.style.left = `${rect.right - 30}px`;
    btn.style.display = "flex";
  }
  function hide() {
    if (toggleButton) {
      toggleButton.style.display = "none";
      activeInput = null;
    }
  }
  var toggleButton, activeInput;
  var init_toggleButton = __esm({
    "src/content/ui/toggleButton.js"() {
      "use strict";
      init_constants();
      toggleButton = null;
      activeInput = null;
    }
  });

  // src/content/services/fieldDetector.js
  function getAllInputs() {
    try {
      const inputs = [];
      const queue = [document];
      const visited = /* @__PURE__ */ new Set();
      while (queue.length > 0) {
        const node = queue.shift();
        if (!node || visited.has(node))
          continue;
        visited.add(node);
        if (node instanceof HTMLElement && (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.tagName === "SELECT")) {
          inputs.push(node);
        }
        if (node instanceof HTMLIFrameElement) {
          try {
            const iframeDoc = node.contentDocument || node.contentWindow?.document;
            if (iframeDoc) {
              queue.push(iframeDoc);
            }
          } catch (err) {
            console.warn("Autofill Extension: Cannot access iframe content (likely cross-origin)");
          }
        }
        if (node instanceof HTMLElement && node.shadowRoot) {
          queue.push(node.shadowRoot);
        }
        let child = node.firstElementChild;
        while (child) {
          queue.push(child);
          child = child.nextElementSibling;
        }
      }
      return inputs;
    } catch (err) {
      console.error("Autofill Extension: Error traversing DOM for inputs.", err);
      const fallbackInputs = document.querySelectorAll("input, textarea, select");
      return Array.from(fallbackInputs);
    }
  }
  function getFieldInfo(input) {
    const type = input instanceof HTMLSelectElement ? "select" : input.type?.toLowerCase();
    if (IGNORED_INPUT_TYPES.includes(type)) {
      return null;
    }
    let nameAttr = input.name || input.id;
    if (!nameAttr) {
      const fallback = input instanceof HTMLInputElement && input.placeholder || input.getAttribute("aria-label");
      if (fallback) {
        nameAttr = "gen_" + fallback.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        input.id = nameAttr;
      } else {
        nameAttr = "autofill_gen_" + Math.random().toString(36).substring(2, 9);
        input.id = nameAttr;
      }
    }
    if (!nameAttr) {
      return null;
    }
    let labelText = "";
    if (input.id) {
      const labelEl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if (labelEl && labelEl.textContent) {
        labelText = labelEl.textContent.trim();
      }
    }
    if (!labelText) {
      let parent = input.parentElement;
      while (parent && parent.tagName !== "FORM" && parent.tagName !== "BODY") {
        if (parent.tagName === "LABEL") {
          const clone = parent.cloneNode(true);
          const inputInClone = clone.querySelector("input, textarea, select");
          if (inputInClone) {
            inputInClone.remove();
          }
          if (clone.textContent) {
            labelText = clone.textContent.trim();
          }
          break;
        }
        parent = parent.parentElement;
      }
    }
    if (!labelText && input.hasAttribute("aria-label")) {
      labelText = input.getAttribute("aria-label")?.trim() || "";
    }
    if (!labelText && input instanceof HTMLInputElement && input.placeholder) {
      labelText = input.placeholder;
    }
    const placeholder = input instanceof HTMLInputElement ? input.placeholder || "" : "";
    return {
      id: input.id,
      name: nameAttr,
      type: type || "text",
      placeholder,
      label: labelText || nameAttr
      // fallback to nameAttr if no label found
    };
  }
  var init_fieldDetector = __esm({
    "src/content/services/fieldDetector.js"() {
      "use strict";
      init_constants();
    }
  });

  // src/content/services/formFiller.js
  async function fillAllFields(profile) {
    const activeProfileData = await chrome.storage.sync.get("activeProfile");
    const activeProfile = profile || activeProfileData.activeProfile || "Profile1";
    const allInputs = getAllInputs();
    const storageKeysToFetch = [];
    allInputs.forEach((el) => {
      const type = el instanceof HTMLSelectElement ? "select" : el.type?.toLowerCase();
      if (!IGNORED_INPUT_TYPES.includes(type)) {
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
          const value = data[storageKey];
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
  var init_formFiller = __esm({
    "src/content/services/formFiller.js"() {
      "use strict";
      init_fieldDetector();
      init_constants();
    }
  });

  // src/content/services/magicFiller.js
  function getRandomSelectValue(select) {
    const options = Array.from(select.options);
    console.log("SELECT DEBUG: Total options:", options.length);
    console.log("SELECT DEBUG: Option values:", options.map((o) => ({ value: o.value, text: o.textContent })));
    const validOptions = options.filter((o) => o.value && o.value.toLowerCase() !== "select" && o.textContent?.toLowerCase() !== "select");
    console.log("SELECT DEBUG: Valid options:", validOptions.length);
    console.log("SELECT DEBUG: Valid option values:", validOptions.map((o) => ({ value: o.value, text: o.textContent })));
    if (validOptions.length === 0) {
      console.log("SELECT DEBUG: No valid options found!");
      return "";
    }
    const randomIdx = Math.floor(Math.random() * validOptions.length);
    const randomOption = validOptions[randomIdx];
    console.log("SELECT DEBUG: Selected option index:", randomIdx, "value:", randomOption?.value);
    return randomOption?.value || "";
  }
  function magicFillAllFields() {
    const allInputs = getAllInputs();
    console.log("MAGIC FILL DEBUG: Total elements found:", allInputs.length);
    console.log("MAGIC FILL DEBUG: Elements:", allInputs.map((el) => ({
      tagName: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id
    })));
    allInputs.forEach((el) => {
      const type = el instanceof HTMLSelectElement ? "select" : el.type?.toLowerCase();
      if (!IGNORED_INPUT_TYPES.includes(type)) {
        const input = el;
        const nameAttr = (input.name || input.id || (input instanceof HTMLInputElement ? input.placeholder : "") || "text").toLowerCase();
        let fakeData = "";
        if (nameAttr.includes("email") || type === "email") {
          fakeData = `testuser_${Math.floor(Math.random() * 1e4)}@example.com`;
        } else if (nameAttr.includes("phone") || nameAttr.includes("tel") || type === "tel") {
          fakeData = `${Math.floor(1e5 + Math.random() * 9e5)}`;
        } else if (nameAttr.includes("first") || nameAttr.includes("fname") || nameAttr.includes("f_name")) {
          const firsts = [
            "Alex",
            "Jordan",
            "Taylor",
            "Casey",
            "Riley",
            "Sam",
            "Jamie"
          ];
          fakeData = firsts[Math.floor(Math.random() * firsts.length)];
        } else if (nameAttr.includes("last") || nameAttr.includes("lname") || nameAttr.includes("l_name")) {
          const lasts = ["Smith", "Doe", "Johnson", "Brown", "Miller", "Davis"];
          fakeData = lasts[Math.floor(Math.random() * lasts.length)];
        } else if (nameAttr.includes("name")) {
          fakeData = `Alex Doe`;
        } else if (nameAttr.includes("company") || nameAttr.includes("org")) {
          fakeData = `TestCorp Solutions Ltd`;
        } else if (nameAttr.includes("address") || nameAttr.includes("street")) {
          fakeData = `${Math.floor(10 + Math.random() * 9990)} Main St`;
        } else if (nameAttr.includes("city")) {
          fakeData = `Metropolis`;
        } else if (nameAttr.includes("zip") || nameAttr.includes("postal")) {
          fakeData = `${Math.floor(1e4 + Math.random() * 9e4)}`;
        } else if (nameAttr.includes("pass") || type === "password") {
          fakeData = `TestPass123!`;
        } else if (type === "radio") {
          const radioGroup = document.querySelectorAll(`input[type="radio"][name="${input.name}"]`);
          if (radioGroup.length > 0) {
            const randomIdx = Math.floor(Math.random() * radioGroup.length);
            const selectedRadio = radioGroup[randomIdx];
            selectedRadio.checked = true;
            selectedRadio.dispatchEvent(new Event("change", { bubbles: true }));
            console.log(`Radio: Selected random option ${randomIdx + 1} of ${radioGroup.length}`);
          }
          const originalBg = input.style.backgroundColor;
          input.style.backgroundColor = MAGIC_FILL_BG_COLOR;
          setTimeout(() => {
            input.style.backgroundColor = originalBg;
          }, 800);
          return;
        } else if (type === "checkbox") {
          const checkboxGroup = document.querySelectorAll(`input[type="checkbox"][name="${input.name}"]`);
          if (checkboxGroup.length > 0) {
            const numToCheck = Math.max(1, Math.floor(checkboxGroup.length * (0.25 + Math.random() * 0.5)));
            const indices = Array.from({ length: checkboxGroup.length }, (_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              const tempIdx = indices[i];
              if (tempIdx !== void 0) {
                indices[i] = indices[j] || 0;
                indices[j] = tempIdx;
              }
            }
            checkboxGroup.forEach((cb) => {
              cb.checked = false;
            });
            for (let i = 0; i < numToCheck && i < indices.length; i++) {
              const idx = indices[i];
              if (idx !== void 0) {
                const checkbox = checkboxGroup[idx];
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }
            console.log(`Checkbox: Randomly checked ${numToCheck} of ${checkboxGroup.length}`);
          } else {
            input.checked = Math.random() > 0.5;
          }
          input.dispatchEvent(new Event("change", { bubbles: true }));
          const originalCheckboxBg = input.style.backgroundColor;
          input.style.backgroundColor = MAGIC_FILL_BG_COLOR;
          setTimeout(() => {
            input.style.backgroundColor = originalCheckboxBg;
          }, 800);
          return;
        } else if (type === "select") {
          if (input instanceof HTMLSelectElement) {
            console.log("SELECT DEBUG: Processing select field:", nameAttr);
            fakeData = getRandomSelectValue(input);
            console.log("SELECT DEBUG: Selected value:", fakeData);
            input.value = fakeData;
            console.log("SELECT DEBUG: After setting, input.value =", input.value);
            console.log("SELECT DEBUG: Selected index:", input.selectedIndex);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            const originalSelectBg = input.style.backgroundColor;
            input.style.backgroundColor = MAGIC_FILL_BG_COLOR;
            setTimeout(() => {
              input.style.backgroundColor = originalSelectBg;
            }, 800);
            return;
          }
        } else if (input.tagName === "TEXTAREA" || nameAttr.includes("desc") || nameAttr.includes("msg") || nameAttr.includes("message")) {
          fakeData = `This is some auto-generated test data for ${nameAttr}. It helps developers quickly test form submissions. 

Random ID: ${Math.random().toString(36).substring(2, 8)}`;
        } else if (type === "number") {
          fakeData = `${Math.floor(1 + Math.random() * 100)}`;
        } else if (type === "date") {
          const d = /* @__PURE__ */ new Date();
          fakeData = d.toISOString().split("T")[0];
        } else {
          fakeData = `Test-${Math.floor(Math.random() * 1e3)}`;
        }
        input.value = fakeData;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
          const originalBg = input.style.backgroundColor;
          input.style.backgroundColor = MAGIC_FILL_BG_COLOR;
          setTimeout(() => {
            input.style.backgroundColor = originalBg;
          }, 800);
        }
      }
    });
    console.log("Autofill Extension: Magic fill completed");
  }
  var init_magicFiller = __esm({
    "src/content/services/magicFiller.js"() {
      "use strict";
      init_fieldDetector();
      init_constants();
    }
  });

  // src/content/index.js
  var require_index = __commonJS({
    "src/content/index.js"() {
      init_toggleButton();
      init_fieldDetector();
      init_formFiller();
      init_magicFiller();
      init_constants();
      console.log("\u{1F680} Auto Fill Extension: Content script loaded!");
      document.addEventListener("scroll", () => {
        hide();
      }, { capture: true, passive: true });
      document.addEventListener("focusin", (e) => {
        const target = e.target;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          const input = target;
          const type = input.type?.toLowerCase();
          if (!IGNORED_INPUT_TYPES.includes(type)) {
            show(input);
          }
        }
      });
      document.addEventListener("focusout", (e) => {
        setTimeout(() => {
          if (document.activeElement !== e.target) {
            hide();
          }
        }, 150);
      });
      function handleKeyDown(event) {
        const isModKey = event.metaKey || event.ctrlKey;
        if (isModKey && event.key.toLowerCase() === "/") {
          event.preventDefault();
          fillAllFields();
          console.log("Autofill Extension: Autofill shortcut triggered.");
        } else if (isModKey && event.key === "\\") {
          event.preventDefault();
          magicFillAllFields();
          console.log("Autofill Extension: Magic fill shortcut triggered.");
        }
      }
      document.addEventListener("keydown", handleKeyDown);
      chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        if (request.action === "GET_FIELDS") {
          const allInputs = getAllInputs();
          const fields = [];
          allInputs.forEach((el) => {
            const fieldInfo = getFieldInfo(el);
            if (fieldInfo) {
              fields.push(fieldInfo);
            }
          });
          sendResponse({ fields });
        } else if (request.action === "FILL_ALL_FIELDS") {
          fillAllFields(request.profile).then(() => {
            sendResponse({ status: "success" });
          });
          return true;
        } else if (request.action === "MAGIC_FILL") {
          magicFillAllFields();
          sendResponse({ status: "success" });
        }
      });
    }
  });
  require_index();
})();
