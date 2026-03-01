// src/popup.ts

document.addEventListener("DOMContentLoaded", () => {
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

  let currentFields: {
    id: string;
    name: string;
    type: string;
    placeholder: string;
    label: string;
  }[] = [];

  function loadFields() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "GET_FIELDS" },
          (response) => {
            if (chrome.runtime.lastError || !response || !response.fields) {
              container.innerHTML =
                '<div style="font-size: 12px; color: #888;">No actionable fields detected or extension not injected (e.g. chrome:// page).</div>';
              fieldCountEl.textContent = "0";
              return;
            }

            currentFields = response.fields;
            fieldCountEl.textContent = currentFields.length.toString();

            if (currentFields.length === 0) {
              container.innerHTML =
                '<div style="font-size: 12px; color: #888;">No actionable fields found on this page.</div>';
              return;
            }

            // Render inputs
            container.innerHTML = "";
            currentFields.forEach((field) => {
              const label = document.createElement("label");
              label.htmlFor = `input_${field.name}`;
              label.textContent = field.label
                ? `Field: ${field.label}`
                : `Field: ${field.name}`;
              label.style.display = "block";
              label.style.marginTop = "10px";
              label.style.fontSize = "12px";
              label.style.color = "#666";

              const input = document.createElement("input");
              input.type = field.type === "email" ? "email" : "text";
              input.id = `input_${field.name}`;
              input.dataset.fieldName = field.name;
              input.placeholder = field.placeholder || field.name;
              input.style.width = "100%";
              input.style.boxSizing = "border-box";
              input.style.padding = "8px";
              input.style.marginTop = "5px";
              input.style.border = "1px solid #ccc";
              input.style.borderRadius = "4px";

              container.appendChild(label);
              container.appendChild(input);
            });

            // Load saved data for these fields using the active profile
            const keysToLoad = currentFields.map(
              (f) => `autofill_${activeProfile}_${f.name}`,
            );
            chrome.storage.sync.get(keysToLoad, (result) => {
              currentFields.forEach((field) => {
                const inputEl = document.getElementById(
                  `input_${field.name}`,
                ) as HTMLInputElement;
                if (
                  inputEl &&
                  result[`autofill_${activeProfile}_${field.name}`]
                ) {
                  inputEl.value = result[
                    `autofill_${activeProfile}_${field.name}`
                  ] as string;
                }
              });
            });
          },
        );
      }
    });
  }

  // Initialize profile from storage
  chrome.storage.sync.get(["activeProfile"], (result) => {
    if (result.activeProfile) {
      activeProfile = result.activeProfile as string;
      profileSelect.value = activeProfile;
    } else {
      chrome.storage.sync.set({ activeProfile });
    }
    loadFields();
  });

  profileSelect.addEventListener("change", () => {
    activeProfile = profileSelect.value;
    chrome.storage.sync.set({ activeProfile }, () => {
      container.innerHTML =
        '<div style="font-size: 12px; color: #888;">Switching profile...</div>';
      loadFields();
    });
  });

  const loadBtn = document.getElementById("loadBtn") as HTMLButtonElement;
  loadBtn.addEventListener("click", () => {
    container.innerHTML =
      '<div style="font-size: 12px; color: #888;">Reloading fields...</div>';
    loadFields();
    statusDiv.textContent = "Fields reloaded!";
    statusDiv.style.color = "#FF9800";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 2000);
  });

  saveBtn.addEventListener("click", () => {
    const dataToSave: Record<string, string> = {};
    currentFields.forEach((field) => {
      const inputEl = document.getElementById(
        `input_${field.name}`,
      ) as HTMLInputElement;
      if (inputEl) {
        dataToSave[`autofill_${activeProfile}_${field.name}`] = inputEl.value;
      }
    });

    chrome.storage.sync.set(dataToSave, () => {
      statusDiv.textContent = "Settings saved!";
      statusDiv.style.color = "#4caf50";
      setTimeout(() => {
        statusDiv.textContent = "";
      }, 2000);
    });
  });

  const fillAllBtn = document.getElementById("fillAllBtn") as HTMLButtonElement;
  fillAllBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "FILL_ALL_FIELDS", profile: activeProfile },
          (response) => {
            if (chrome.runtime.lastError) {
              statusDiv.textContent = "Error: Could not fill fields.";
              statusDiv.style.color = "red";
            } else {
              statusDiv.textContent = "All possible fields filled!";
              statusDiv.style.color = "#2196F3";
            }
            setTimeout(() => {
              statusDiv.textContent = "";
            }, 2000);
          },
        );
      }
    });
  });

  const magicFillBtn = document.getElementById(
    "magicFillBtn",
  ) as HTMLButtonElement;
  magicFillBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "MAGIC_FILL" },
          (response) => {
            if (chrome.runtime.lastError) {
              statusDiv.textContent = "Error: Could not perform magic fill.";
              statusDiv.style.color = "red";
            } else {
              statusDiv.textContent = "Magic Filled with Fake Data!";
              statusDiv.style.color = "#9c27b0";
            }
            setTimeout(() => {
              statusDiv.textContent = "";
            }, 2000);
          },
        );
      }
    });
  });
});
