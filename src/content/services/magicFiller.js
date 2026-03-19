// src/content/services/magicFiller.ts
import { getAllInputs } from "./fieldDetector.js";
import { CITIES, COMPANY_NAME_EN, COMPANY_NAME_KH, COUNTRIES, EMAIL, FIRST_NAME_EN, IGNORED_INPUT_TYPES, JOB_TITLES, LAST_NAME_EN, LOREM_PARAGRAPHS, MAGIC_FILL_BG_COLOR, NAME_KH, PHONE_NUMBERS, STATES_PROVINCES, STREET_ADDRESSES, USERNAMES, WEBSITES, } from "../../shared/constants.js";
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
    // ── Email ─────────────────────────────────────────────────────────────
    if (type === "email" || nameAttr.includes("email"))
        return pick(EMAIL);
    // ── Phone / Tel ───────────────────────────────────────────────────────
    if (type === "tel" || nameAttr.includes("phone") || nameAttr.includes("tel")
        || nameAttr.includes("mobile") || nameAttr.includes("contact_number")
        || nameAttr.includes("cellphone"))
        return pick(PHONE_NUMBERS);
    // ── Password ──────────────────────────────────────────────────────────
    if (type === "password" || nameAttr.includes("pass"))
        return "TestPass123!";
    // ── Date ──────────────────────────────────────────────────────────────
    if (type === "date" || nameAttr.includes("date") || nameAttr.includes("dob")
        || nameAttr.includes("birthday") || nameAttr.includes("birth")) {
        // Generate a random date between 1980 and 2005
        const year = 1980 + Math.floor(Math.random() * 25);
        const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
        const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    // ── Age ───────────────────────────────────────────────────────────────
    if (nameAttr.includes("age"))
        return `${20 + Math.floor(Math.random() * 40)}`;
    // ── Number (generic) ──────────────────────────────────────────────────
    if (type === "number")
        return `${Math.floor(1 + Math.random() * 10000)}`;
    // ── Business registration ─────────────────────────────────────────────
    if (nameAttr.includes("businessregistrationnumber") || nameAttr.includes("registration")
        || nameAttr.includes("license") || nameAttr.includes("tax_id")
        || nameAttr.includes("taxid") || nameAttr.includes("tin")) {
        return (Math.floor(100000000 + Math.random() * 900000000)).toString();
    }
    // ── Username ──────────────────────────────────────────────────────────
    if (nameAttr.includes("username") || nameAttr.includes("user_name")
        || nameAttr.includes("login") || nameAttr.includes("userid"))
        return pick(USERNAMES);
    // ── Website / URL ─────────────────────────────────────────────────────
    if (nameAttr.includes("website") || nameAttr.includes("url")
        || nameAttr.includes("homepage") || nameAttr.includes("site")
        || type === "url")
        return pick(WEBSITES);
    // ── Name variants — order matters: more-specific before generic "name" ──
    if (nameAttr.includes("name_kh") || nameAttr.includes("name_km")
        || nameAttr.includes("khname") || nameAttr.includes("kmname")
        || nameAttr.includes("namekm"))
        return pick(NAME_KH);
    if (nameAttr.includes("companynamekm") || nameAttr.includes("companynamekh")
        || nameAttr.includes("company_km") || nameAttr.includes("company_kh"))
        return pick(COMPANY_NAME_KH);
    if (nameAttr.includes("companynameen") || nameAttr.includes("companyen"))
        return pick(COMPANY_NAME_EN);
    if (nameAttr.includes("company") || nameAttr.includes("org")
        || nameAttr.includes("employer") || nameAttr.includes("workplace"))
        return pick(COMPANY_NAME_EN);
    // ── Job / Title / Position ────────────────────────────────────────────
    if (nameAttr.includes("job") || nameAttr.includes("title")
        || nameAttr.includes("position") || nameAttr.includes("role")
        || nameAttr.includes("occupation") || nameAttr.includes("profession"))
        return pick(JOB_TITLES);
    // ── Name fields ───────────────────────────────────────────────────────
    if (nameAttr.includes("middle"))
        return pick(["A", "B", "J", "M", "R", "K", "L"]);
    if (nameAttr.includes("first") || nameAttr.includes("fname") || nameAttr.includes("f_name")
        || nameAttr.includes("given"))
        return pick(FIRST_NAME_EN);
    if (nameAttr.includes("last") || nameAttr.includes("lname") || nameAttr.includes("l_name")
        || nameAttr.includes("surname") || nameAttr.includes("family"))
        return pick(LAST_NAME_EN);
    if (nameAttr.includes("name"))
        return `${pick(FIRST_NAME_EN)} ${pick(LAST_NAME_EN)}`;
    // ── Address fields ────────────────────────────────────────────────────
    if (nameAttr.includes("address") || nameAttr.includes("street")
        || nameAttr.includes("addr"))
        return pick(STREET_ADDRESSES);
    if (nameAttr.includes("city") || nameAttr.includes("town")
        || nameAttr.includes("locality"))
        return pick(CITIES);
    if (nameAttr.includes("state") || nameAttr.includes("province")
        || nameAttr.includes("region"))
        return pick(STATES_PROVINCES);
    if (nameAttr.includes("country") || nameAttr.includes("nation"))
        return pick(COUNTRIES);
    if (nameAttr.includes("zip") || nameAttr.includes("postal")
        || nameAttr.includes("postcode"))
        return `${Math.floor(10000 + Math.random() * 90000)}`;
    // ── Textarea / Description / Message ──────────────────────────────────
    if (el.tagName === "TEXTAREA" || nameAttr.includes("desc")
        || nameAttr.includes("msg") || nameAttr.includes("message")
        || nameAttr.includes("comment") || nameAttr.includes("note")
        || nameAttr.includes("bio") || nameAttr.includes("about")
        || nameAttr.includes("summary") || nameAttr.includes("detail")
        || nameAttr.includes("feedback") || nameAttr.includes("reason")
        || nameAttr.includes("remark") || nameAttr.includes("instruction"))
        return pick(LOREM_PARAGRAPHS);
    // ── SSN / ID numbers ──────────────────────────────────────────────────
    if (nameAttr.includes("ssn") || nameAttr.includes("social_security")) {
        return `${Math.floor(100 + Math.random() * 899)}-${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000 + Math.random() * 8999)}`;
    }
    if (nameAttr.includes("national_id") || nameAttr.includes("id_number")
        || nameAttr.includes("idcard") || nameAttr.includes("citizen")) {
        return (Math.floor(1000000000 + Math.random() * 9000000000)).toString();
    }
    // ── Quantity / Amount ─────────────────────────────────────────────────
    if (nameAttr.includes("qty") || nameAttr.includes("quantity")
        || nameAttr.includes("count"))
        return `${1 + Math.floor(Math.random() * 50)}`;
    if (nameAttr.includes("amount") || nameAttr.includes("price")
        || nameAttr.includes("cost") || nameAttr.includes("salary")
        || nameAttr.includes("income") || nameAttr.includes("budget")) {
        return `${(100 + Math.random() * 9900).toFixed(2)}`;
    }
    // ── Fallback: generate something based on the field name ──────────────
    const firstName = pick(FIRST_NAME_EN);
    const lastName = pick(LAST_NAME_EN);
    return `${firstName} ${lastName}`;
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
