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
 * Selectors that identify a dialog, most standards-based first. The framework
 * class names at the end are a last resort for libraries that don't set the
 * ARIA attributes.
 */
const MODAL_SELECTORS: readonly string[] = [
  "dialog[open]",
  '[aria-modal="true"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  ".modal.show",
  ".modal.in",
  ".ReactModal__Content",
  ".MuiDialog-container",
  ".ant-modal-wrap",
  ".v-dialog--active",
];

/**
 * Highest z-index anywhere in the element's ancestor chain, used to decide
 * which of several candidates is actually painted on top.
 */
function stackingScore(el: HTMLElement): number {
  let best = 0;
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const z = parseInt(window.getComputedStyle(node).zIndex, 10);
    if (!Number.isNaN(z)) best = Math.max(best, z);
    node = node.parentElement;
  }
  return best;
}

/** A <dialog> opened with showModal() sits in the top layer above everything. */
function isTopLayer(el: HTMLElement): boolean {
  try {
    return el.matches(":modal");
  } catch {
    return false; // :modal is unsupported on older engines
  }
}

function collectModalCandidates(): HTMLElement[] {
  const found: HTMLElement[] = [];
  const selector = MODAL_SELECTORS.join(",");

  const scan = (root: Document | ShadowRoot) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (!found.includes(el)) found.push(el);
    });
  };

  scan(document);

  // Walking every element to find shadow roots is expensive, so only do it when
  // the light DOM turned up nothing.
  if (found.length === 0) {
    const queue: (Document | ShadowRoot)[] = [document];
    const seen = new Set<Document | ShadowRoot>();
    while (queue.length > 0) {
      const root = queue.shift();
      if (!root || seen.has(root)) continue;
      seen.add(root);
      scan(root);
      root.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) queue.push(el.shadowRoot);
      });
    }
  }

  return found;
}

/**
 * Find the dialog currently on top, or null when the page has none open.
 *
 * When a dialog is open, the fields behind it aren't reachable by the user, so
 * filling them would silently write to a form they can't see. Everything below
 * scopes to this element when it exists.
 */
export function findActiveModal(): HTMLElement | null {
  const visible = collectModalCandidates().filter((el) => {
    // A closed dialog usually stays in the DOM with display:none.
    if (el instanceof HTMLDialogElement && !el.open) return false;
    return isElementVisible(el);
  });

  if (visible.length === 0) return null;

  // Prefer the innermost candidate: libraries often nest role="dialog" inside
  // an aria-modal wrapper, and the inner node is the tighter scope.
  const innermost = visible.filter(
    (el) => !visible.some((other) => other !== el && el.contains(other)),
  );
  const candidates = innermost.length > 0 ? innermost : visible;

  let best = candidates[0] as HTMLElement;
  let bestKey: [number, number] = [
    isTopLayer(best) ? 1 : 0,
    stackingScore(best),
  ];

  for (const el of candidates.slice(1)) {
    const key: [number, number] = [isTopLayer(el) ? 1 : 0, stackingScore(el)];
    // Later in the list wins ties, which favours the most recently opened.
    if (
      key[0] > bestKey[0] ||
      (key[0] === bestKey[0] && key[1] >= bestKey[1])
    ) {
      best = el;
      bestKey = key;
    }
  }

  return best;
}

/**
 * Find all inputs, textareas, and selects, piercing through Shadow DOM and
 * iframes. Defaults to the open dialog when there is one, so callers never
 * touch fields hidden behind it.
 */
export function getAllInputs(
  scope?: Document | ShadowRoot | Element,
): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] {
  const searchRoot = scope ?? findActiveModal() ?? document;
  try {
    const inputs: (
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    )[] = [];
    const queue: (Document | ShadowRoot | Element)[] = [searchRoot];
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
    // Fallback if the traversal somehow fails — still respects the dialog scope
    const fallbackInputs = searchRoot.querySelectorAll("input, textarea, select");
    return Array.from(fallbackInputs).filter(
      (el) => el instanceof HTMLElement && isElementVisible(el as HTMLElement),
    ) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
  }
}

/**
 * Position of a control among all controls in its root. Fields that carry no
 * name or id have no author-provided identity, so their storage key has to be
 * derived from something stable — this index survives a page reload, whereas a
 * random suffix does not.
 */
function controlIndex(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): number {
  const root = (input.getRootNode?.() || input.ownerDocument || document) as
    | Document
    | DocumentFragment;
  const all = root.querySelectorAll("input, textarea, select");
  return Array.prototype.indexOf.call(all, input);
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
  // Group lookups match on `name`, which isn't unique across the page, so a
  // dialog field must only gather options from inside that dialog. Lookups
  // keyed on an id (label[for], aria-labelledby) stay document-wide — ids are
  // unique, so they can't bleed, and the target may legitimately sit outside.
  const groupScope: ParentNode =
    input.closest<HTMLElement>(MODAL_SELECTORS.join(",")) ?? root;
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
        // Skip a label that wraps its own control — it names that field, not
        // this one, and borrowing it collides two fields onto one key.
        const prevOwnsAControl = !!prev.querySelector("input, textarea, select");
        if (prev.tagName === "LABEL" && prev.textContent && !prevOwnsAControl) {
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
    // The index keeps the key unique — label heuristics can hand two different
    // fields the same text — and keeps it reproducible on the next visit.
    const slug = labelText
      ? labelText.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
      : type || "field";
    nameAttr = `gen_${slug}_${controlIndex(input)}`;
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
    const radios = groupScope.querySelectorAll<HTMLInputElement>(
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
    const boxes = groupScope.querySelectorAll<HTMLInputElement>(
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
