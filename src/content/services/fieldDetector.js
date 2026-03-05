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
                (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.tagName === "SELECT")) {
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
        const fallback = (input instanceof HTMLInputElement && input.placeholder) || input.getAttribute("aria-label");
        if (fallback) {
            nameAttr =
                "gen_" + fallback.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
            // Assign this to the input id so we can find it later
            input.id = nameAttr;
        }
        else {
            // Absolute fallback: generate a random but somewhat stable ID
            nameAttr =
                "autofill_gen_" + Math.random().toString(36).substring(2, 9);
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
        while (parent &&
            parent.tagName !== "FORM" &&
            parent.tagName !== "BODY") {
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
    const placeholder = input instanceof HTMLInputElement ? input.placeholder || "" : "";
    return {
        id: input.id,
        name: nameAttr,
        type: type || "text",
        placeholder,
        label: labelText || nameAttr, // fallback to nameAttr if no label found
    };
}
//# sourceMappingURL=fieldDetector.js.map