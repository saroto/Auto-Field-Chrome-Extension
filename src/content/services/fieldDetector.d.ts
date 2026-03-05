import { Field } from "../../shared/types.js";
/**
 * Find all inputs, textareas, and selects in the document, piercing through Shadow DOM and iframes
 */
export declare function getAllInputs(): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
/**
 * Extract field information (label, name, type, etc.) from an input, textarea, or select element
 */
export declare function getFieldInfo(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): Field | null;
//# sourceMappingURL=fieldDetector.d.ts.map