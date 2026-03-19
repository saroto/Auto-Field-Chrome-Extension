// src/content/services/fieldDetector.ts

/**
 * Check if an element is visible to the user.
 * This is crucial for avoiding inactive tabs (like tab=0 when we're on tab=1)
 */
function isElementVisible(el: HTMLElement): boolean {
  if (
    el instanceof HTMLInputElement &&
    (el.type === "hidden" || el.style.display === "none")
  ) {
    return false;
  }
  // Check dimensions (this usually catches display:none on wrappers/tabs)
  if (el.offsetWidth === 0 || el.offsetHeight === 0) {
    // If it's a hidden input, allow width/height 0, otherwise it's genuinely hidden
    if (el instanceof HTMLInputElement && el.type === "hidden") {
      return false;
    }
    // Also consider elements with 0 opacity as hidden
    const style = window.getComputedStyle(el);
    if (
      style.opacity === "0" ||
      style.visibility === "hidden" ||
      style.display === "none"
    ) {
      return false;
    }
  }

  // Double check computed style
  const computedStyle = window.getComputedStyle(el);
  if (
    computedStyle.display === "none" ||
    computedStyle.visibility === "hidden" ||
    computedStyle.opacity === "0"
  ) {
    return false;
  }

  // Also check parents up to the body
  let parent = el.parentElement;
  while (parent && parent.tagName !== "BODY") {
    const parentStyle = window.getComputedStyle(parent);
    if (
      parentStyle.display === "none" ||
      parentStyle.visibility === "hidden" ||
      parentStyle.opacity === "0"
    ) {
      return false;
    }
    parent = parent.parentElement;
  }

  return true;
}
import { IGNORED_INPUT_TYPES } from "../../shared/constants.js";
import { Field } from "../../shared/types.js";

/**
 * Find all inputs, textareas, and selects in the document, piercing through Shadow DOM and iframes
 */
export function getAllInputs(): (
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
)[] {
  try {
    const inputs: (
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    )[] = [];
    const queue: (Document | ShadowRoot | Element)[] = [document];
    const visited = new Set<Document | ShadowRoot | Element>();

    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || visited.has(node)) continue;
      visited.add(node);

      // Check if it's an input, textarea, or select
      if (
        node instanceof HTMLElement &&
        (node.tagName === "INPUT" ||
          node.tagName === "TEXTAREA" ||
          node.tagName === "SELECT") &&
        isElementVisible(node as HTMLElement)
      ) {
        inputs.push(
          node as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
        );
      }

      // Handle iframes - try to access their content
      if (node instanceof HTMLIFrameElement) {
        try {
          const iframeDoc =
            node.contentDocument || node.contentWindow?.document;
          if (iframeDoc) {
            queue.push(iframeDoc);
          }
        } catch (err) {
          console.warn(
            "Autofill Extension: Cannot access iframe content (likely cross-origin)",
          );
        }
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
    const fallbackInputs = document.querySelectorAll("input, textarea, select");
    return Array.from(fallbackInputs).filter(
      (el) => el instanceof HTMLElement && isElementVisible(el as HTMLElement),
    ) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
  }
}

/**
 * Extract field information (label, name, type, etc.) from an input, textarea, or select element
 */
export function getFieldInfo(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): Field | null {
  const root = (input.getRootNode?.() || input.ownerDocument || document) as
    | Document
    | DocumentFragment;
  const type =
    input instanceof HTMLSelectElement ? "select" : input.type?.toLowerCase();

  // Ignore certain input types
  if (IGNORED_INPUT_TYPES.includes(type)) {
    return null;
  }

  let rawNameAttr = input.name || input.id;
  let labelText = "";

  // Extract label BEFORE finalizing nameAttr to use it as a stable fallback

  // Case 1: <label for="inputId">
  if (input.id) {
    const labelEl = root.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (labelEl && labelEl.textContent) {
      labelText = labelEl.textContent.trim();
    }
  }

  // Case 2: Input is wrapped inside a <label>
  if (!labelText) {
    let parent = input.parentElement;
    while (parent && parent.tagName !== "FORM" && parent.tagName !== "BODY") {
      if (parent.tagName === "LABEL") {
        const clone = parent.cloneNode(true) as HTMLElement;
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

  // Case 3: aria-label or placeholder
  if (!labelText && input.hasAttribute("aria-label")) {
    labelText = input.getAttribute("aria-label")?.trim() || "";
  }
  if (!labelText && input instanceof HTMLInputElement && input.placeholder) {
    labelText = input.placeholder;
  }

  // Case 4: intelligent nearby fallback
  if (!labelText) {
    let parent = input.parentElement;
    let depth = 0;
    while (
      parent &&
      parent.tagName !== "FORM" &&
      parent.tagName !== "BODY" &&
      depth < 3
    ) {
      const labelsInContainer = Array.from(parent.querySelectorAll("label"));
      if (labelsInContainer.length === 1 && labelsInContainer[0]?.textContent) {
        labelText = labelsInContainer[0].textContent.trim();
        break;
      }

      if (parent.previousElementSibling) {
        const prev = parent.previousElementSibling;
        if (prev.tagName === "LABEL" && prev.textContent) {
          labelText = prev.textContent.trim();
          break;
        }

        if (
          "querySelector" in prev &&
          typeof prev.querySelector === "function"
        ) {
          const labelInPrev = (prev as Element).querySelector("label");
          if (labelInPrev && labelInPrev.textContent) {
            labelText = labelInPrev.textContent.trim();
            break;
          }
        }
      }

      parent = parent.parentElement;
      depth++;
    }
  }

  // Clean up extracted label text early so it can be used for ID generation
  if (labelText) {
    labelText = labelText.replace(/[:*]\s*$/g, "").trim();
  }

  // Finalize nameAttr with stable fallback
  let nameAttr = rawNameAttr;
  if (!nameAttr) {
    if (labelText) {
      nameAttr = "gen_" + labelText.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    } else {
      // Very last resort, still potentially unstable but rare if label exists
      nameAttr =
        "autofill_gen_unknown_" + Math.random().toString(36).substring(2, 6);
    }
    input.id = nameAttr;
  }

  if (!nameAttr) {
    return null;
  }

  // Case 5 (radio/checkbox groups only): find the group-level label, not
  // the individual option label.  Priority: <fieldset><legend>, then an
  // aria-labelledby target, then humanise the name attribute.
  if (
    (type === "radio" || type === "checkbox") &&
    input instanceof HTMLInputElement
  ) {
    let groupLabel = "";

    // 4a: walk up to the nearest <fieldset> and read its <legend>
    let ancestor = input.parentElement;
    while (
      ancestor &&
      ancestor.tagName !== "FORM" &&
      ancestor.tagName !== "BODY"
    ) {
      if (ancestor.tagName === "FIELDSET") {
        const legend = ancestor.querySelector("legend");
        if (legend) {
          groupLabel = legend.textContent?.trim() || "";
        }
        break;
      }
      ancestor = ancestor.parentElement;
    }

    // 4b: aria-labelledby on the group container
    if (!groupLabel) {
      let el: HTMLElement | null = input.parentElement;
      while (el && el.tagName !== "FORM" && el.tagName !== "BODY") {
        const labelledBy = el.getAttribute("aria-labelledby");
        if (labelledBy) {
          try {
            const target = root.querySelector(`#${CSS.escape(labelledBy)}`);
            if (target) {
              groupLabel = target.textContent?.trim() || "";
              break;
            }
          } catch (e) {
            // Ignore invalid selectors
          }
        }
        el = el.parentElement;
      }
    }

    // 4c: humanise the name attribute as last resort
    //     e.g. "gender_option" → "Gender Option"
    if (!groupLabel && input.name) {
      groupLabel = input.name
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    if (groupLabel) {
      labelText = groupLabel;
    }
  }

  const placeholder =
    input instanceof HTMLInputElement ? input.placeholder || "" : "";

  // Collect options for <select>, radio groups, and checkbox groups
  let options: { value: string; label: string }[] | undefined;

  if (input instanceof HTMLSelectElement) {
    options = Array.from(input.options)
      .filter((o) => o.value !== "")
      .map((o) => ({ value: o.value, label: o.text.trim() }));
  } else if (type === "radio" && input.name) {
    const radios = root.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][name="${CSS.escape(input.name)}"]`,
    );
    options = Array.from(radios).map((r) => {
      let radioLabel = r.value;
      if (r.id) {
        const lbl = root.querySelector(`label[for="${CSS.escape(r.id)}"]`);
        if (lbl) radioLabel = lbl.textContent?.trim() || r.value;
      }
      if (radioLabel === r.value) {
        let parent = r.parentElement;
        while (
          parent &&
          parent.tagName !== "FORM" &&
          parent.tagName !== "BODY"
        ) {
          if (parent.tagName === "LABEL") {
            const clone = parent.cloneNode(true) as HTMLElement;
            clone.querySelector("input")?.remove();
            radioLabel = clone.textContent?.trim() || r.value;
            break;
          }
          parent = parent.parentElement;
        }
      }
      return { value: r.value, label: radioLabel };
    });
  } else if (type === "checkbox" && input.name) {
    const boxes = root.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="${CSS.escape(input.name)}"]`,
    );
    if (boxes.length > 1) {
      options = Array.from(boxes).map((cb) => {
        let cbLabel = cb.value;
        if (cb.id) {
          const lbl = root.querySelector(`label[for="${CSS.escape(cb.id)}"]`);
          if (lbl) cbLabel = lbl.textContent?.trim() || cb.value;
        }
        if (cbLabel === cb.value) {
          let parent = cb.parentElement;
          while (
            parent &&
            parent.tagName !== "FORM" &&
            parent.tagName !== "BODY"
          ) {
            if (parent.tagName === "LABEL") {
              const clone = parent.cloneNode(true) as HTMLElement;
              clone.querySelector("input")?.remove();
              cbLabel = clone.textContent?.trim() || cb.value;
              break;
            }
            parent = parent.parentElement;
          }
        }
        return { value: cb.value, label: cbLabel };
      });
    }
  }

  // Clean up extracted label text
  if (labelText) {
    // Remove trailing colons, asterisks, and extra whitespace, e.g., "First Name: *" -> "First Name"
    labelText = labelText.replace(/[:*]\s*$/g, "").trim();
  }

  return {
    id: input.id,
    name: nameAttr,
    type: type || "text",
    placeholder,
    label: labelText || nameAttr, // fallback to nameAttr if no label found
    ...(options && { options }),
  };
}
