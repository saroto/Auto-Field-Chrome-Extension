// src/content.ts

let activeInput: HTMLInputElement | HTMLTextAreaElement | null = null;
let toggleButton: HTMLDivElement | null = null;

function createToggleButton() {
  if (toggleButton) return toggleButton;

  toggleButton = document.createElement("div");
  toggleButton.className = "autofill-extension-toggle";
  toggleButton.addEventListener("mousedown", async (e) => {
    e.preventDefault(); // Keep focus on the input
    e.stopPropagation();

    if (!activeInput) {
      console.warn(
        "Autofill Extension: No active input found when toggle was clicked.",
      );
      return;
    }

    const nameAttr = activeInput.name || activeInput.id;
    if (!nameAttr) {
      console.warn(
        "Autofill Extension: Active input has no name or id attribute.",
      );
      return;
    }

    const activeProfileData = await chrome.storage.sync.get("activeProfile");
    const activeProfile = activeProfileData.activeProfile || "Profile1";

    const storageKey = `autofill_${activeProfile}_${nameAttr}`;
    const data = await chrome.storage.sync.get(storageKey);

    if (data[storageKey] !== undefined) {
      // Small timeout ensures the event loop processes this after any blur anomalies
      setTimeout(() => {
        if (activeInput) {
          activeInput.value = data[storageKey] as string;
          activeInput.dispatchEvent(new Event("input", { bubbles: true }));
          activeInput.dispatchEvent(new Event("change", { bubbles: true }));
          console.log(
            `Autofill Extension: Filled ${nameAttr} with saved data.`,
          );
          hideToggleButton();
        }
      }, 10);
    } else {
      console.warn(
        `Autofill Extension: No saved data found for key ${storageKey}.`,
      );
    }
  });

  document.body.appendChild(toggleButton);
  return toggleButton;
}

function showToggleButton(input: HTMLInputElement | HTMLTextAreaElement) {
  activeInput = input;
  const btn = createToggleButton();
  const rect = input.getBoundingClientRect();

  // Use fixed positioning so it's not affected by `transform` stacking contexts in modals
  btn.style.position = "fixed";
  // Position the button on the right side of the input (relative to viewport)
  btn.style.top = `${rect.top + rect.height / 2 - 12}px`;
  btn.style.left = `${rect.right - 30}px`;
  btn.style.display = "flex";
}

function hideToggleButton() {
  if (toggleButton) {
    toggleButton.style.display = "none";
    activeInput = null;
  }
}

// Hide toggle button on scroll because its fixed position will become detached
document.addEventListener(
  "scroll",
  () => {
    if (toggleButton && toggleButton.style.display === "flex") {
      hideToggleButton();
    }
  },
  { capture: true, passive: true },
);

// Global focus listener
document.addEventListener("focusin", (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
    const input = target as HTMLInputElement | HTMLTextAreaElement;
    // Ignore hidden, submit, checkbox, radio buttons
    const type = input.type?.toLowerCase();
    if (
      [
        "hidden",
        "submit",
        "button",
        "checkbox",
        "radio",
        "file",
        "image",
        "reset",
      ].includes(type)
    ) {
      return;
    }
    showToggleButton(input);
  }
});

// Hide button when clicking outside or focusing out
document.addEventListener("focusout", (e) => {
  // Slight delay to allow click on the button to process
  setTimeout(() => {
    if (document.activeElement !== activeInput) {
      hideToggleButton();
    }
  }, 150);
});

// Helper function to find all inputs, piercing through Shadow DOM
function getAllInputs(): (HTMLInputElement | HTMLTextAreaElement)[] {
  try {
    const inputs: (HTMLInputElement | HTMLTextAreaElement)[] = [];
    const queue: (Document | ShadowRoot | Element)[] = [document];

    while (queue.length > 0) {
      const node = queue.shift();
      if (!node) continue;

      // Check if it's an input
      if (
        node instanceof HTMLElement &&
        (node.tagName === "INPUT" || node.tagName === "TEXTAREA")
      ) {
        inputs.push(node as HTMLInputElement | HTMLTextAreaElement);
      }

      // Enqueue shadow root if it exists
      if (node instanceof HTMLElement && node.shadowRoot) {
        queue.push(node.shadowRoot);
      }

      // Enqueue direct children
      let child = node.firstElementChild;
      while (child) {
        queue.push(child);
        child = child.nextElementSibling;
      }
    }
    return inputs;
  } catch (err) {
    console.error("Autofill Extension: Error traversing DOM for inputs.", err);
    // Fallback if the traversal somehow fails
    const fallbackInputs = document.querySelectorAll("input, textarea");
    return Array.from(fallbackInputs) as (
      | HTMLInputElement
      | HTMLTextAreaElement
    )[];
  }
}

// Handle messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_FIELDS") {
    const allInputs = getAllInputs();
    const fields: {
      id: string;
      name: string;
      type: string;
      placeholder: string;
      label: string;
    }[] = [];

    allInputs.forEach((el) => {
      const input = el as HTMLInputElement | HTMLTextAreaElement;
      const type = input.type?.toLowerCase();
      // Ignore hidden, submit, checkbox, radio buttons, and elements inside invisible modals if size is 0
      // We will allow all visible inputs
      if (
        ![
          "hidden",
          "submit",
          "button",
          "checkbox",
          "radio",
          "file",
          "image",
          "reset",
        ].includes(type || "")
      ) {
        // Determine a unique identifier or name for the field
        let nameAttr = input.name || input.id;

        if (!nameAttr) {
          // Fallback to placeholder or aria-label
          const fallback =
            input.placeholder || input.getAttribute("aria-label");
          if (fallback) {
            nameAttr =
              "gen_" + fallback.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
            // Assign this to the input id so we can find it later
            input.id = nameAttr;
          } else {
            // Absolute fallback: generate a random but somewhat stable ID
            nameAttr =
              "autofill_gen_" + Math.random().toString(36).substring(2, 9);
            input.id = nameAttr;
          }
        }

        if (nameAttr) {
          // Try to find an associated label
          let labelText = "";

          // Case 1: <label for="inputId">
          if (input.id) {
            const labelEl = document.querySelector(
              `label[for="${CSS.escape(input.id)}"]`,
            );
            if (labelEl && labelEl.textContent) {
              labelText = labelEl.textContent.trim();
            }
          }

          // Case 2: Input is wrapped inside a <label>
          if (!labelText) {
            let parent = input.parentElement;
            while (
              parent &&
              parent.tagName !== "FORM" &&
              parent.tagName !== "BODY"
            ) {
              if (parent.tagName === "LABEL") {
                // Clone the label to remove the input's text content from the extracted string
                const clone = parent.cloneNode(true) as HTMLElement;
                const inputInClone = clone.querySelector("input, textarea");
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

          // Case 3: aria-label or placeholder
          if (!labelText && input.hasAttribute("aria-label")) {
            labelText = input.getAttribute("aria-label")?.trim() || "";
          }
          if (!labelText && input.placeholder) {
            labelText = input.placeholder;
          }

          // Only list fields that have a name or id
          fields.push({
            id: input.id,
            name: nameAttr,
            type: type || "text",
            placeholder: input.placeholder || "",
            label: labelText || nameAttr, // fallback to nameAttr if no label found
          });
        }
      }
    });

    sendResponse({ fields });
  } else if (request.action === "FILL_ALL_FIELDS") {
    const activeProfile = request.profile || "Profile1";
    const allInputs = getAllInputs();
    const storageKeysToFetch: string[] = [];

    allInputs.forEach((el) => {
      const input = el as HTMLInputElement | HTMLTextAreaElement;
      const type = input.type?.toLowerCase();
      if (
        ![
          "hidden",
          "submit",
          "button",
          "checkbox",
          "radio",
          "file",
          "image",
          "reset",
        ].includes(type || "")
      ) {
        const nameAttr = input.name || input.id;
        if (nameAttr) {
          storageKeysToFetch.push(`autofill_${activeProfile}_${nameAttr}`);
        }
      }
    });

    if (storageKeysToFetch.length > 0) {
      chrome.storage.sync.get(storageKeysToFetch, (data) => {
        allInputs.forEach((el) => {
          const input = el as HTMLInputElement | HTMLTextAreaElement;
          const nameAttr = input.name || input.id;
          if (nameAttr && data[`autofill_${activeProfile}_${nameAttr}`]) {
            input.value = data[
              `autofill_${activeProfile}_${nameAttr}`
            ] as string;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
        sendResponse({ status: "success" });
      });
      return true; // Keep message channel open for async response
    } else {
      sendResponse({ status: "no fields found" });
    }
  } else if (request.action === "MAGIC_FILL") {
    const allInputs = getAllInputs();
    allInputs.forEach((el) => {
      const input = el as HTMLInputElement | HTMLTextAreaElement;
      const type = input.type?.toLowerCase();
      if (
        ![
          "hidden",
          "submit",
          "button",
          "checkbox",
          "radio",
          "file",
          "image",
          "reset",
        ].includes(type || "")
      ) {
        const nameAttr = (
          input.name ||
          input.id ||
          input.placeholder ||
          "text"
        ).toLowerCase();
        let fakeData = "";

        if (nameAttr.includes("email") || type === "email") {
          fakeData = `testuser_${Math.floor(Math.random() * 10000)}@example.com`;
        } else if (
          nameAttr.includes("phone") ||
          nameAttr.includes("tel") ||
          type === "tel"
        ) {
          fakeData = `+1555${Math.floor(100000 + Math.random() * 900000)}`;
        } else if (
          nameAttr.includes("first") ||
          nameAttr.includes("fname") ||
          nameAttr.includes("f_name")
        ) {
          const firsts = [
            "Alex",
            "Jordan",
            "Taylor",
            "Casey",
            "Riley",
            "Sam",
            "Jamie",
          ];
          fakeData = firsts[
            Math.floor(Math.random() * firsts.length)
          ] as string;
        } else if (
          nameAttr.includes("last") ||
          nameAttr.includes("lname") ||
          nameAttr.includes("l_name")
        ) {
          const lasts = ["Smith", "Doe", "Johnson", "Brown", "Miller", "Davis"];
          fakeData = lasts[Math.floor(Math.random() * lasts.length)] as string;
        } else if (nameAttr.includes("name")) {
          fakeData = `Alex Doe`;
        } else if (nameAttr.includes("company") || nameAttr.includes("org")) {
          fakeData = `TestCorp Solutions Ltd`;
        } else if (
          nameAttr.includes("address") ||
          nameAttr.includes("street")
        ) {
          fakeData = `${Math.floor(10 + Math.random() * 9990)} Main St`;
        } else if (nameAttr.includes("city")) {
          fakeData = `Metropolis`;
        } else if (nameAttr.includes("zip") || nameAttr.includes("postal")) {
          fakeData = `${Math.floor(10000 + Math.random() * 90000)}`;
        } else if (nameAttr.includes("pass") || type === "password") {
          fakeData = `TestPass123!`;
        } else if (
          input.tagName === "TEXTAREA" ||
          nameAttr.includes("desc") ||
          nameAttr.includes("msg") ||
          nameAttr.includes("message")
        ) {
          fakeData = `This is some auto-generated test data for ${nameAttr}. It helps developers quickly test form submissions. \n\nRandom ID: ${Math.random().toString(36).substring(2, 8)}`;
        } else if (type === "number") {
          fakeData = `${Math.floor(1 + Math.random() * 100)}`;
        } else if (type === "date") {
          const d = new Date();
          fakeData = d.toISOString().split("T")[0] as string;
        } else {
          // Generic fallback
          fakeData = `Test-${Math.floor(Math.random() * 1000)}`;
        }

        input.value = fakeData;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        // Visual feedback
        const originalBg = input.style.backgroundColor;
        input.style.backgroundColor = "#f3e5f5"; // light purple for magic fill
        setTimeout(() => {
          input.style.backgroundColor = originalBg;
        }, 800);
      }
    });

    sendResponse({ status: "success" });
  }
});
