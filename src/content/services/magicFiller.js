// src/content/services/magicFiller.ts
import { getAllInputs } from "./fieldDetector.js";
import { IGNORED_INPUT_TYPES, MAGIC_FILL_BG_COLOR } from "../../shared/constants.js";
/**
 * Random option selection for select elements
 */
function getRandomSelectValue(select) {
    const options = Array.from(select.options);
    console.log("SELECT DEBUG: Total options:", options.length);
    console.log("SELECT DEBUG: Option values:", options.map((o) => ({ value: o.value, text: o.textContent })));
    // Filter out empty/placeholder options
    const validOptions = options.filter((o) => o.value && o.value.toLowerCase() !== "select" && o.textContent?.toLowerCase() !== "select");
    console.log("SELECT DEBUG: Valid options:", validOptions.length);
    console.log("SELECT DEBUG: Valid option values:", validOptions.map((o) => ({ value: o.value, text: o.textContent })));
    if (validOptions.length === 0) {
        console.log("SELECT DEBUG: No valid options found!");
        return "";
    }
    // Pick a random option
    const randomIdx = Math.floor(Math.random() * validOptions.length);
    const randomOption = validOptions[randomIdx];
    console.log("SELECT DEBUG: Selected option index:", randomIdx, "value:", randomOption?.value);
    return randomOption?.value || "";
}
/**
 * Fill all fields with random test data
 */
export function magicFillAllFields() {
    const allInputs = getAllInputs();
    console.log("MAGIC FILL DEBUG: Total elements found:", allInputs.length);
    console.log("MAGIC FILL DEBUG: Elements:", allInputs.map((el) => ({
        tagName: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
    })));
    allInputs.forEach((el) => {
        const type = el instanceof HTMLSelectElement ? "select" : el.type?.toLowerCase();
        if (!IGNORED_INPUT_TYPES.includes(type)) {
            const input = el;
            const nameAttr = (input.name ||
                input.id ||
                (input instanceof HTMLInputElement ? input.placeholder : "") ||
                "text").toLowerCase();
            let fakeData = "";
            if (nameAttr.includes("email") || type === "email") {
                fakeData = `testuser_${Math.floor(Math.random() * 10000)}@example.com`;
            }
            else if (nameAttr.includes("phone") ||
                nameAttr.includes("tel") ||
                type === "tel") {
                fakeData = `${Math.floor(100000 + Math.random() * 900000)}`;
            }
            else if (nameAttr.includes("first") ||
                nameAttr.includes("fname") ||
                nameAttr.includes("f_name")) {
                const firsts = [
                    "Alex",
                    "Jordan",
                    "Taylor",
                    "Casey",
                    "Riley",
                    "Sam",
                    "Jamie",
                ];
                fakeData = firsts[Math.floor(Math.random() * firsts.length)];
            }
            else if (nameAttr.includes("last") ||
                nameAttr.includes("lname") ||
                nameAttr.includes("l_name")) {
                const lasts = ["Smith", "Doe", "Johnson", "Brown", "Miller", "Davis"];
                fakeData = lasts[Math.floor(Math.random() * lasts.length)];
            }
            else if (nameAttr.includes("name")) {
                fakeData = `Alex Doe`;
            }
            else if (nameAttr.includes("company") || nameAttr.includes("org")) {
                fakeData = `TestCorp Solutions Ltd`;
            }
            else if (nameAttr.includes("address") ||
                nameAttr.includes("street")) {
                fakeData = `${Math.floor(10 + Math.random() * 9990)} Main St`;
            }
            else if (nameAttr.includes("city")) {
                fakeData = `Metropolis`;
            }
            else if (nameAttr.includes("zip") || nameAttr.includes("postal")) {
                fakeData = `${Math.floor(10000 + Math.random() * 90000)}`;
            }
            else if (nameAttr.includes("pass") || type === "password") {
                fakeData = `TestPass123!`;
            }
            else if (type === "radio") {
                // For radio buttons, select a RANDOM one with the same name
                const radioGroup = document.querySelectorAll(`input[type="radio"][name="${input.name}"]`);
                if (radioGroup.length > 0) {
                    // Pick a random radio button
                    const randomIdx = Math.floor(Math.random() * radioGroup.length);
                    const selectedRadio = radioGroup[randomIdx];
                    selectedRadio.checked = true;
                    selectedRadio.dispatchEvent(new Event("change", { bubbles: true }));
                    console.log(`Radio: Selected random option ${randomIdx + 1} of ${radioGroup.length}`);
                }
                // Visual feedback
                const originalBg = input.style.backgroundColor;
                input.style.backgroundColor = MAGIC_FILL_BG_COLOR;
                setTimeout(() => {
                    input.style.backgroundColor = originalBg;
                }, 800);
                return; // Skip the generic value setting below
            }
            else if (type === "checkbox") {
                // For checkboxes, randomly decide to check or uncheck
                const checkboxGroup = document.querySelectorAll(`input[type="checkbox"][name="${input.name}"]`);
                if (checkboxGroup.length > 0) {
                    // Pick random checkboxes to check (25-75% of them)
                    const numToCheck = Math.max(1, Math.floor(checkboxGroup.length * (0.25 + Math.random() * 0.5)));
                    const indices = Array.from({ length: checkboxGroup.length }, (_, i) => i);
                    // Shuffle using Fisher-Yates
                    for (let i = indices.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        const tempIdx = indices[i];
                        if (tempIdx !== undefined) {
                            indices[i] = indices[j] || 0;
                            indices[j] = tempIdx;
                        }
                    }
                    // Uncheck all first
                    checkboxGroup.forEach((cb) => {
                        cb.checked = false;
                    });
                    // Check selected ones
                    for (let i = 0; i < numToCheck && i < indices.length; i++) {
                        const idx = indices[i];
                        if (idx !== undefined) {
                            const checkbox = checkboxGroup[idx];
                            checkbox.checked = true;
                            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
                        }
                    }
                    console.log(`Checkbox: Randomly checked ${numToCheck} of ${checkboxGroup.length}`);
                }
                else {
                    // Standalone checkbox - randomly check/uncheck
                    input.checked = Math.random() > 0.5;
                }
                input.dispatchEvent(new Event("change", { bubbles: true }));
                // Visual feedback
                const originalCheckboxBg = input.style.backgroundColor;
                input.style.backgroundColor = MAGIC_FILL_BG_COLOR;
                setTimeout(() => {
                    input.style.backgroundColor = originalCheckboxBg;
                }, 800);
                return; // Skip the generic value setting below
            }
            else if (type === "select") {
                // Random select option selection
                if (input instanceof HTMLSelectElement) {
                    console.log("SELECT DEBUG: Processing select field:", nameAttr);
                    fakeData = getRandomSelectValue(input);
                    console.log("SELECT DEBUG: Selected value:", fakeData);
                    input.value = fakeData;
                    console.log("SELECT DEBUG: After setting, input.value =", input.value);
                    console.log("SELECT DEBUG: Selected index:", input.selectedIndex);
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                    // Visual feedback
                    const originalSelectBg = input.style.backgroundColor;
                    input.style.backgroundColor = MAGIC_FILL_BG_COLOR;
                    setTimeout(() => {
                        input.style.backgroundColor = originalSelectBg;
                    }, 800);
                    return; // Skip generic value setting below
                }
            }
            else if (input.tagName === "TEXTAREA" ||
                nameAttr.includes("desc") ||
                nameAttr.includes("msg") ||
                nameAttr.includes("message")) {
                fakeData = `This is some auto-generated test data for ${nameAttr}. It helps developers quickly test form submissions. \n\nRandom ID: ${Math.random().toString(36).substring(2, 8)}`;
            }
            else if (type === "number") {
                fakeData = `${Math.floor(1 + Math.random() * 100)}`;
            }
            else if (type === "date") {
                const d = new Date();
                fakeData = d.toISOString().split("T")[0];
            }
            else {
                // Generic fallback
                fakeData = `Test-${Math.floor(Math.random() * 1000)}`;
            }
            input.value = fakeData;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            // Visual feedback only for input/textarea
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
//# sourceMappingURL=magicFiller.js.map