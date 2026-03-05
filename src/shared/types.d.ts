export interface Field {
    id: string;
    name: string;
    type: string;
    placeholder: string;
    label: string;
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