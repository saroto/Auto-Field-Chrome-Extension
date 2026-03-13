// src/popup/ui/fieldRenderer.ts
function applySelectStyles(el) {
    el.style.width = "100%";
    el.style.boxSizing = "border-box";
    el.style.padding = "7px 10px";
    el.style.marginTop = "4px";
    el.style.border = "1.5px solid #e2e8f0";
    el.style.borderRadius = "8px";
    el.style.fontSize = "12.5px";
    el.style.color = "#374151";
    el.style.background = "#f8fafc";
    el.style.fontFamily = "kantumruy pro";
}
function applyInputStyles(el) {
    el.style.width = "100%";
    el.style.boxSizing = "border-box";
    el.style.padding = "7px 10px";
    el.style.marginTop = "4px";
    el.style.border = "1.5px solid #e2e8f0";
    el.style.borderRadius = "8px";
    el.style.fontSize = "12.5px";
    el.style.color = "#374151";
    el.style.background = "#f8fafc";
    el.style.fontFamily = "kantumruy pro";
}
function makeFieldLabel(text) {
    const label = document.createElement("label");
    label.textContent = text;
    label.style.display = "block";
    label.style.marginTop = "12px";
    label.style.fontSize = "10.5px";
    label.style.color = "#6b7280";
    label.style.fontWeight = "700";
    label.style.textTransform = "uppercase";
    label.style.letterSpacing = "0.5px";
    label.style.fontFamily = "kantumruy pro";
    return label;
}
/**
 * Render fields in the popup DOM
 */
export function renderFields(fields, container) {
    container.innerHTML = "";
    if (fields.length === 0) {
        container.innerHTML =
            '<p class="placeholder-msg">No actionable fields found on this page.</p>';
        return;
    }
    fields.forEach((field) => {
        const wrapper = document.createElement("div");
        const label = makeFieldLabel(field.label || field.name);
        wrapper.appendChild(label);
        if (field.type === "select") {
            // ── <select> dropdown ────────────────────────────────────────────
            const sel = document.createElement("select");
            sel.id = `input_${field.name}`;
            sel.dataset.fieldName = field.name;
            const emptyOpt = document.createElement("option");
            emptyOpt.value = "";
            emptyOpt.textContent = "-- Select --";
            sel.appendChild(emptyOpt);
            (field.options ?? []).forEach((opt) => {
                const o = document.createElement("option");
                o.value = opt.value;
                o.textContent = opt.label;
                sel.appendChild(o);
            });
            applySelectStyles(sel);
            wrapper.appendChild(sel);
        }
        else if (field.type === "radio") {
            // ── Radio group → actual radio buttons ──────────────────────────
            const groupDiv = document.createElement("div");
            groupDiv.id = `group_${field.name}`;
            groupDiv.style.marginTop = "4px";
            groupDiv.style.padding = "8px 10px";
            groupDiv.style.border = "1.5px solid #e2e8f0";
            groupDiv.style.borderRadius = "8px";
            groupDiv.style.background = "#f8fafc";
            (field.options ?? []).forEach((opt) => {
                const row = document.createElement("label");
                row.style.display = "flex";
                row.style.alignItems = "center";
                row.style.gap = "8px";
                row.style.fontSize = "12.5px";
                row.style.padding = "3px 0";
                row.style.cursor = "pointer";
                row.style.width = "100%";
                const rb = document.createElement("input");
                rb.type = "radio";
                rb.name = `popup_${field.name}`;
                rb.dataset.group = field.name;
                rb.dataset.value = opt.value;
                rb.style.flexShrink = "0";
                const span = document.createElement("span");
                span.textContent = opt.label || opt.value;
                span.style.overflow = "hidden";
                span.style.textOverflow = "ellipsis";
                span.style.whiteSpace = "nowrap";
                row.appendChild(rb);
                row.appendChild(span);
                groupDiv.appendChild(row);
            });
            wrapper.appendChild(groupDiv);
        }
        else if (field.type === "checkbox" &&
            field.options &&
            field.options.length > 1) {
            // ── Checkbox group → one checkbox per option ───────────────────
            const groupDiv = document.createElement("div");
            groupDiv.id = `group_${field.name}`;
            groupDiv.style.marginTop = "4px";
            groupDiv.style.padding = "8px 10px";
            groupDiv.style.border = "1.5px solid #e2e8f0";
            groupDiv.style.borderRadius = "8px";
            groupDiv.style.background = "#f8fafc";
            field.options.forEach((opt) => {
                const row = document.createElement("label");
                row.style.display = "flex";
                row.style.alignItems = "center";
                row.style.gap = "8px";
                row.style.fontSize = "12.5px";
                row.style.padding = "3px 0";
                row.style.cursor = "pointer";
                row.style.width = "100%";
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.dataset.group = field.name;
                cb.dataset.value = opt.value;
                cb.style.flexShrink = "0";
                const span = document.createElement("span");
                span.textContent = opt.label || opt.value;
                span.style.overflow = "hidden";
                span.style.textOverflow = "ellipsis";
                span.style.whiteSpace = "nowrap";
                row.appendChild(cb);
                row.appendChild(span);
                groupDiv.appendChild(row);
            });
            wrapper.appendChild(groupDiv);
        }
        else if (field.type === "checkbox") {
            // ── Single checkbox (boolean toggle) ─────────────────────────────
            const row = document.createElement("label");
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.gap = "8px";
            row.style.marginTop = "5px";
            row.style.cursor = "pointer";
            row.style.fontSize = "12px";
            row.style.width = "100%";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.id = `input_${field.name}`;
            cb.dataset.fieldName = field.name;
            cb.style.flexShrink = "0";
            const span = document.createElement("span");
            span.textContent = field.label || field.name;
            row.appendChild(cb);
            row.appendChild(span);
            wrapper.appendChild(row);
        }
        else {
            // ── Text / email / number / date variants / textarea ─────────────
            const DATE_TYPES = ["date", "time", "datetime-local", "month", "week"];
            const input = document.createElement("input");
            if (DATE_TYPES.includes(field.type)) {
                input.type = field.type; // native browser date/time picker
            }
            else if (field.type === "email") {
                input.type = "email";
            }
            else if (field.type === "number" || field.type === "tel") {
                input.type = field.type;
            }
            else {
                input.type = "text";
            }
            input.id = `input_${field.name}`;
            input.dataset.fieldName = field.name;
            if (!DATE_TYPES.includes(field.type)) {
                input.placeholder = field.placeholder || field.name;
            }
            applyInputStyles(input);
            wrapper.appendChild(input);
        }
        container.appendChild(wrapper);
    });
}
