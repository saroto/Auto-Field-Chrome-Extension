import { Field } from "../../shared/types.js";
/**
 * Get the currently active tab
 */
export declare function getActiveTab(): Promise<chrome.tabs.Tab>;
/**
 * Send a message to the content script in a specific tab
 */
export declare function sendMessageToTab<T>(tabId: number, message: any): Promise<T>;
/**
 * Load fields from the active tab
 */
export declare function loadFieldsFromTab(): Promise<Field[]>;
/**
 * Send fill all fields message to the active tab
 */
export declare function fillTabFields(profile: string): Promise<void>;
/**
 * Send magic fill message to the active tab
 */
export declare function magicFillTab(): Promise<void>;
/**
 * Save field data to storage
 */
export declare function saveFieldData(data: Record<string, string>): Promise<void>;
/**
 * Load field data from storage
 */
export declare function loadFieldData(keys: string[]): Promise<Record<string, any>>;
/**
 * Get the active profile from storage
 */
export declare function getActiveProfile(): Promise<string>;
/**
 * Set the active profile in storage
 */
export declare function setActiveProfile(profile: string): Promise<void>;
//# sourceMappingURL=popupService.d.ts.map