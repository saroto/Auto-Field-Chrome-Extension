declare let activeInput: HTMLInputElement | HTMLTextAreaElement | null;
declare let toggleButton: HTMLDivElement | null;
declare function createToggleButton(): HTMLDivElement;
declare function showToggleButton(input: HTMLInputElement | HTMLTextAreaElement): void;
declare function hideToggleButton(): void;
declare function getAllInputs(): (HTMLInputElement | HTMLTextAreaElement)[];
declare function fillAllFields(profile?: string): Promise<void>;
declare function magicFillAllFields(): void;
declare function handleKeyDown(event: KeyboardEvent): void;
//# sourceMappingURL=content.d.ts.map