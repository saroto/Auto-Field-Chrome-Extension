// src/popup/ui/fieldRenderer.ts

import { Field } from "../../shared/types.js";

const DATE_TYPES: readonly string[] = [
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
];

/** Short mono badge so a select reads differently from a checkbox at a glance. */
function kindLabel(field: Field): string {
  if (field.type === "select") return "select";
  if (field.type === "radio") return "choose one";
  if (field.type === "checkbox") {
    return field.options && field.options.length > 1 ? "choose any" : "yes/no";
  }
  if (field.type === "textarea") return "long text";
  return field.type;
}

function makeEmptyState(message: string): HTMLParagraphElement {
  const p = document.createElement("p");
  p.className = "placeholder-msg";
  p.textContent = message;
  return p;
}

function makeFieldHeader(field: Field): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "field-label";

  const text = document.createElement("span");
  text.className = "field-name";
  text.textContent = field.label || field.name;
  label.appendChild(text);

  const kind = document.createElement("span");
  kind.className = "field-kind";
  kind.textContent = kindLabel(field);
  label.appendChild(kind);

  return label;
}

/** A boxed set of radios or checkboxes — a set of options, not a blank to fill. */
function makeOptionGroup(
  field: Field,
  inputType: "radio" | "checkbox",
): HTMLDivElement {
  const groupDiv = document.createElement("div");
  groupDiv.id = `group_${field.name}`;
  groupDiv.className = "option-group";

  (field.options ?? []).forEach((opt) => {
    const row = document.createElement("label");
    row.className = "option-row";

    const control = document.createElement("input");
    control.type = inputType;
    if (inputType === "radio") control.name = `popup_${field.name}`;
    control.dataset.group = field.name;
    control.dataset.value = opt.value;

    const span = document.createElement("span");
    span.textContent = opt.label || opt.value;

    row.appendChild(control);
    row.appendChild(span);
    groupDiv.appendChild(row);
  });

  return groupDiv;
}

function makeTextInput(field: Field): HTMLInputElement {
  const input = document.createElement("input");

  if (
    DATE_TYPES.includes(field.type) ||
    field.type === "email" ||
    field.type === "number" ||
    field.type === "tel"
  ) {
    input.type = field.type;
  } else {
    input.type = "text";
  }

  input.id = `input_${field.name}`;
  input.className = "field-input";
  input.dataset.fieldName = field.name;
  if (!DATE_TYPES.includes(field.type)) {
    input.placeholder = field.placeholder || field.name;
  }

  return input;
}

function makeSelect(field: Field): HTMLSelectElement {
  const sel = document.createElement("select");
  sel.id = `input_${field.name}`;
  sel.className = "field-input";
  sel.dataset.fieldName = field.name;

  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "Leave blank";
  sel.appendChild(emptyOpt);

  (field.options ?? []).forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    sel.appendChild(o);
  });

  return sel;
}

/**
 * Render fields in the popup DOM
 */
export function renderFields(fields: Field[], container: HTMLDivElement): void {
  container.textContent = "";

  if (fields.length === 0) {
    container.appendChild(
      makeEmptyState("No fields here. Rescan once the form has loaded."),
    );
    return;
  }

  fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    // Lowercased haystack for the filter box in the section header.
    wrapper.dataset.search = `${field.label} ${field.name}`.toLowerCase();
    wrapper.appendChild(makeFieldHeader(field));

    if (field.type === "select") {
      wrapper.appendChild(makeSelect(field));
    } else if (field.type === "radio") {
      wrapper.appendChild(makeOptionGroup(field, "radio"));
    } else if (
      field.type === "checkbox" &&
      field.options &&
      field.options.length > 1
    ) {
      wrapper.appendChild(makeOptionGroup(field, "checkbox"));
    } else if (field.type === "checkbox") {
      // Single checkbox: the label already names it, so the row just confirms.
      const row = document.createElement("label");
      row.className = "checkbox-row";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = `input_${field.name}`;
      cb.dataset.fieldName = field.name;

      const span = document.createElement("span");
      span.textContent = "Tick this box";

      row.appendChild(cb);
      row.appendChild(span);
      wrapper.appendChild(row);
    } else {
      wrapper.appendChild(makeTextInput(field));
    }

    container.appendChild(wrapper);
  });
}
