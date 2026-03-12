// src/content/services/magicFiller.ts
import { getAllInputs } from "./fieldDetector.js";
import { COMPANY_NAME_EN, COMPANY_NAME_KH, EMAIL, FIRST_NAME_EN, IGNORED_INPUT_TYPES, LAST_NAME_EN, MAGIC_FILL_BG_COLOR, NAME_KH, } from "../../shared/constants.js";
/**
 * Random option selection for select elements
 */
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function flashField(el) {
    const originalBg = el.style.backgroundColor;
    el.style.backgroundColor = MAGIC_FILL_BG_COLOR;
    setTimeout(() => {
        el.style.backgroundColor = originalBg;
    }, 800);
}
function triggerEvents(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
}
/** Get a random valid option value from a <select> */
function getRandomSelectValue(select) {
    const valid = Array.from(select.options).filter((o) => o.value && !["select", ""].includes(o.value.toLowerCase())
        && o.textContent?.toLowerCase().trim() !== "select");
    return valid.length ? (pick(valid).value) : "";
}
const processedGroups = new Set();
function resolveValue(el, nameAttr, type) {
    // Returns null for types that handle their own logic (radio, checkbox, select)
    if (type === "email" || nameAttr.includes("email"))
        return pick(EMAIL);
    if (type === "tel" || nameAttr.includes("phone") || nameAttr.includes("tel"))
        return `${Math.floor(100000 + Math.random() * 900000)}`;
    if (type === "password" || nameAttr.includes("pass"))
        return "TestPass123!";
    if (type === "number")
        return `${Math.floor(1 + Math.random() * 10000)}`;
    if (type === "date") {
        return new Date().toISOString().split("T")[0];
    }
    if (nameAttr.includes("businessregistrationnumber")) {
        return (Math.floor(100000000 + Math.random() * 900000000)).toString();
    }
    // Name variants — order matters: more-specific checks before generic "name"
    if (nameAttr.includes("name_kh") || nameAttr.includes("name_km") ||
        nameAttr.includes("khname") || nameAttr.includes("kmname") ||
        nameAttr.includes("namekm"))
        return pick(NAME_KH);
    if (nameAttr.includes("companynamekm") || nameAttr.includes("companynamekh") ||
        nameAttr.includes("company_km") || nameAttr.includes("company_kh"))
        return pick(COMPANY_NAME_KH);
    if (nameAttr.includes("companynameen") || nameAttr.includes("companyen"))
        return pick(COMPANY_NAME_EN);
    if (nameAttr.includes("company") || nameAttr.includes("org"))
        return pick(COMPANY_NAME_EN);
    if (nameAttr.includes("first") || nameAttr.includes("fname") || nameAttr.includes("f_name"))
        return pick(FIRST_NAME_EN);
    if (nameAttr.includes("last") || nameAttr.includes("lname") || nameAttr.includes("l_name"))
        return pick(LAST_NAME_EN);
    if (nameAttr.includes("name"))
        return `${pick(FIRST_NAME_EN)} ${pick(LAST_NAME_EN)}`;
    if (nameAttr.includes("address") || nameAttr.includes("street"))
        return `${Math.floor(10 + Math.random() * 9990)} Main St`;
    if (nameAttr.includes("city"))
        return "Metropolis";
    if (nameAttr.includes("zip") || nameAttr.includes("postal"))
        return `${Math.floor(10000 + Math.random() * 90000)}`;
    if (el.tagName === "TEXTAREA" || nameAttr.includes("desc") ||
        nameAttr.includes("msg") || nameAttr.includes("message"))
        return `Auto-generated test data for "${nameAttr}".\n\nRandom ID: ${Math.random().toString(36).substring(2, 8)}`;
    return `Test-${Math.floor(Math.random() * 1000)}`;
}
/**
 * Fill all fields with random test data
 */
export function magicFillAllFields() {
    processedGroups.clear(); // reset between runs
    const allInputs = getAllInputs();
    console.log("[MagicFill] Found", allInputs, "elements");
    for (const el of allInputs) {
        const type = el instanceof HTMLSelectElement
            ? "select"
            : el.type?.toLowerCase() ?? "text";
        if (IGNORED_INPUT_TYPES.includes(type))
            continue;
        const input = el;
        const nameAttr = (input.name || input.id ||
            (input instanceof HTMLInputElement ? input.placeholder : "") || "text").toLowerCase();
        // ── Select ──────────────────────────────────────────────────────────────
        if (type === "select" && input instanceof HTMLSelectElement) {
            const val = getRandomSelectValue(input);
            if (val) {
                input.value = val;
                triggerEvents(input);
                flashField(input);
            }
            continue;
        }
        // ── Radio ───────────────────────────────────────────────────────────────
        if (type === "radio") {
            const groupKey = `radio::${input.name}`;
            if (processedGroups.has(groupKey))
                continue; // already handled this group  
            processedGroups.add(groupKey);
            const radios = Array.from(document.querySelectorAll(`input[type="radio"][name="${input.name}"]`));
            const chosen = pick(radios);
            chosen.checked = true;
            triggerEvents(chosen);
            flashField(chosen);
            continue;
        }
        // ── Checkbox ─────────────────────────────────────────────────────────────  
        if (type === "checkbox") {
            const groupKey = `checkbox::${input.name}`;
            if (input.name && processedGroups.has(groupKey))
                continue;
            if (input.name)
                processedGroups.add(groupKey);
            const boxes = input.name
                ? Array.from(document.querySelectorAll(`input[type="checkbox"][name="${input.name}"]`))
                : [input];
            // Uncheck all, then randomly check 25–75 %
            boxes.forEach((cb) => {
                if (cb.checked) {
                    cb.checked = false;
                    triggerEvents(cb);
                }
            });
            const numToCheck = Math.max(1, Math.floor(boxes.length * (0.25 + Math.random() * 0.5)));
            const shuffled = [...boxes].sort(() => Math.random() - 0.5);
            shuffled.slice(0, numToCheck).forEach((cb) => {
                if (!cb.checked) {
                    cb.checked = true;
                    triggerEvents(cb);
                }
                flashField(cb);
            });
            continue;
        }
        // ── Text-like inputs & textareas ─────────────────────────────────────────
        const value = resolveValue(input, nameAttr, type);
        if (value === null)
            continue;
        input.value = value;
        triggerEvents(input);
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            flashField(input);
        }
    }
    console.log("[MagicFill] Done");
}
