// src/content/services/fieldDetector.ts
import { IGNORED_INPUT_TYPES } from "../../shared/constants.js";
/**
 * Find all inputs, textareas, and selects in the document, piercing through Shadow DOM and iframes
 */
export function getAllInputs() {
    try {
        const inputs = [];
        const queue = [document];
        const visited = new Set();
        while (queue.length > 0) {
            const node = queue.shift();
            if (!node || visited.has(node))
                continue;
            visited.add(node);
            // Check if it's an input, textarea, or select
            if (node instanceof HTMLElement &&
                (node.tagName === "INPUT" ||
                    node.tagName === "TEXTAREA" ||
                    node.tagName === "SELECT")) {
                inputs.push(node);
            }
            // Handle iframes - try to access their content
            if (node instanceof HTMLIFrameElement) {
                try {
                    const iframeDoc = node.contentDocument || node.contentWindow?.document;
                    if (iframeDoc) {
                        queue.push(iframeDoc);
                    }
                }
                catch (err) {
                    console.warn("Autofill Extension: Cannot access iframe content (likely cross-origin)");
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
    }
    catch (err) {
        console.error("Autofill Extension: Error traversing DOM for inputs.", err);
        // Fallback if the traversal somehow fails
        const fallbackInputs = document.querySelectorAll("input, textarea, select");
        return Array.from(fallbackInputs);
    }
}
/**
 * Extract field information (label, name, type, etc.) from an input, textarea, or select element
 */
export function getFieldInfo(input) {
    const type = input instanceof HTMLSelectElement ? "select" : input.type?.toLowerCase();
    // Ignore certain input types
    if (IGNORED_INPUT_TYPES.includes(type)) {
        return null;
    }
    // Determine a unique identifier or name for the field
    let nameAttr = input.name || input.id;
    if (!nameAttr) {
        // Fallback to placeholder or aria-label
        const fallback = (input instanceof HTMLInputElement && input.placeholder) ||
            input.getAttribute("aria-label");
        if (fallback) {
            nameAttr = "gen_" + fallback.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
            // Assign this to the input id so we can find it later
            input.id = nameAttr;
        }
        else {
            // Absolute fallback: generate a random but somewhat stable ID
            nameAttr = "autofill_gen_" + Math.random().toString(36).substring(2, 9);
            input.id = nameAttr;
        }
    }
    if (!nameAttr) {
        return null;
    }
    // Try to find an associated label
    let labelText = "";
    // Case 1: <label for="inputId">
    if (input.id) {
        const labelEl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (labelEl && labelEl.textContent) {
            labelText = labelEl.textContent.trim();
        }
    }
    // Case 2: Input is wrapped inside a <label>
    if (!labelText) {
        let parent = input.parentElement;
        while (parent && parent.tagName !== "FORM" && parent.tagName !== "BODY") {
            if (parent.tagName === "LABEL") {
                // Clone the label to remove the input's text content from the extracted string
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
    // Case 3: aria-label or placeholder
    if (!labelText && input.hasAttribute("aria-label")) {
        labelText = input.getAttribute("aria-label")?.trim() || "";
    }
    if (!labelText && input instanceof HTMLInputElement && input.placeholder) {
        labelText = input.placeholder;
    }
    // Case 4 (radio/checkbox groups only): find the group-level label, not
    // the individual option label.  Priority: <fieldset><legend>, then an
    // aria-labelledby target, then humanise the name attribute.
    if ((type === "radio" || type === "checkbox") &&
        input instanceof HTMLInputElement) {
        let groupLabel = "";
        // 4a: walk up to the nearest <fieldset> and read its <legend>
        let ancestor = input.parentElement;
        while (ancestor &&
            ancestor.tagName !== "FORM" &&
            ancestor.tagName !== "BODY") {
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
            let el = input.parentElement;
            while (el && el.tagName !== "FORM" && el.tagName !== "BODY") {
                const labelledBy = el.getAttribute("aria-labelledby");
                if (labelledBy) {
                    const target = document.getElementById(labelledBy);
                    if (target) {
                        groupLabel = target.textContent?.trim() || "";
                        break;
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
    const placeholder = input instanceof HTMLInputElement ? input.placeholder || "" : "";
    // Collect options for <select>, radio groups, and checkbox groups
    let options;
    if (input instanceof HTMLSelectElement) {
        options = Array.from(input.options)
            .filter((o) => o.value !== "")
            .map((o) => ({ value: o.value, label: o.text.trim() }));
    }
    else if (type === "radio" && input.name) {
        const radios = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(input.name)}"]`);
        options = Array.from(radios).map((r) => {
            let radioLabel = r.value;
            if (r.id) {
                const lbl = document.querySelector(`label[for="${CSS.escape(r.id)}"]`);
                if (lbl)
                    radioLabel = lbl.textContent?.trim() || r.value;
            }
            if (radioLabel === r.value) {
                let parent = r.parentElement;
                while (parent &&
                    parent.tagName !== "FORM" &&
                    parent.tagName !== "BODY") {
                    if (parent.tagName === "LABEL") {
                        const clone = parent.cloneNode(true);
                        clone.querySelector("input")?.remove();
                        radioLabel = clone.textContent?.trim() || r.value;
                        break;
                    }
                    parent = parent.parentElement;
                }
            }
            return { value: r.value, label: radioLabel };
        });
    }
    else if (type === "checkbox" && input.name) {
        const boxes = document.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(input.name)}"]`);
        if (boxes.length > 1) {
            options = Array.from(boxes).map((cb) => {
                let cbLabel = cb.value;
                if (cb.id) {
                    const lbl = document.querySelector(`label[for="${CSS.escape(cb.id)}"]`);
                    if (lbl)
                        cbLabel = lbl.textContent?.trim() || cb.value;
                }
                if (cbLabel === cb.value) {
                    let parent = cb.parentElement;
                    while (parent &&
                        parent.tagName !== "FORM" &&
                        parent.tagName !== "BODY") {
                        if (parent.tagName === "LABEL") {
                            const clone = parent.cloneNode(true);
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
    return {
        id: input.id,
        name: nameAttr,
        type: type || "text",
        placeholder,
        label: labelText || nameAttr, // fallback to nameAttr if no label found
        ...(options && { options }),
    };
}
//# sourceMappingURL=fieldDetector.js.map