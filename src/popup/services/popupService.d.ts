import { Field, Profile, ProfileData } from "../../shared/types.js";
/**
 * Get the currently active tab.
 * When opened as a standalone window via chrome.windows.create the target
 * tabId is passed as a URL query parameter so we resolve it directly.
 */
export declare function getActiveTab(): Promise<chrome.tabs.Tab>;
/**
 * Get the current tab URL
 */
export declare function getCurrentTabUrl(): Promise<string>;
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
 * Get all profiles from storage
 */
export declare function getAllProfiles(): Promise<ProfileData>;
/**
 * Save all profiles to storage
 */
export declare function saveAllProfiles(profiles: ProfileData): Promise<void>;
/**
 * Create a new profile
 */
export declare function createProfile(name: string, url: string, fields: Field[]): Promise<Profile>;
/**
 * Delete a profile
 */
export declare function deleteProfile(profileId: string): Promise<void>;
/**
 * Get a specific profile
 */
export declare function getProfile(profileId: string): Promise<Profile | null>;
/**
 * Save profile field values
 */
export declare function saveProfileFieldValues(profileId: string, fieldValues: Record<string, string>): Promise<void>;
/**
 * Load profile field values
 */
export declare function loadProfileFieldValues(profileId: string, fieldNames: string[]): Promise<Record<string, string>>;
/**
 * Get the active profile from storage
 */
export declare function getActiveProfile(): Promise<string>;
/**
 * Set the active profile in storage
 */
export declare function setActiveProfile(profile: string): Promise<void>;
//# sourceMappingURL=popupService.d.ts.map