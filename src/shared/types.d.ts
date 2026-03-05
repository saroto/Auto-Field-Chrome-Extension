export interface FieldOption {
    value: string;
    label: string;
}
export interface Field {
    id: string;
    name: string;
    type: string;
    placeholder: string;
    label: string;
    options?: FieldOption[];
}
export interface Profile {
    id: string;
    name: string;
    url: string;
    createdAt: number;
    fields: Field[];
}
export interface ProfileData {
    [key: string]: Profile;
}
export interface GetFieldsMessage {
    action: "GET_FIELDS";
}
export interface FillAllFieldsMessage {
    action: "FILL_ALL_FIELDS";
    profile: string;
}
export interface MagicFillMessage {
    action: "MAGIC_FILL";
}
export type ContentMessage = GetFieldsMessage | FillAllFieldsMessage | MagicFillMessage;
//# sourceMappingURL=types.d.ts.map