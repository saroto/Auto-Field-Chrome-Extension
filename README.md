# Autofill Form Chrome Extension

A smart, developer-friendly Google Chrome extension built with TypeScript that detects form fields on web pages (including modern modals and Shadow DOMs) and allows you to save and automatically inject data into them.

## Features

- **Smart Field Detection**: Safely pierces through Shadow DOMs and iframes to find all actionable `input` and `textarea` fields on any website.
- **Dynamic Field Labels**: Extracts human-readable labels from `<label>` tags or `aria-label` attributes to make identifying fields in the popup easy.
- **Robust Fallbacks**: Automatically generates stable IDs based on placeholders if a form field is missing conventional `name` or `id` attributes (common in modern React/Vue apps).
- **"Fill All" Action**: Instantly fills all matching fields on the page with your saved data using a single button click.
- **Manual "Load Fields"**: A refresh button to rescan the page without closing the popup—perfect for fields that appear inside dynamically loaded modals or dialogs.
- **Floating Injector**: Alternatively, when you focus on a specific input, a floating action button appears allowing you to inject data directly into that single field.

## Installation (Unpacked)

Since this is a custom local extension, you must install it directly into Chrome using "Developer mode".

1. **Build the extension**: Ensure you have run `npm install` and `npm run build` so the TypeScript is compiled to JS.
2. Open Google Chrome.
3. Open the Extensions Management page by navigating to `chrome://extensions/` or clicking the puzzle piece icon on the toolbar > Manage extensions.
4. Enable **Developer mode** using the toggle switch in the top right corner.
5. Click the **Load unpacked** button in the top left.
6. Select this project's root folder (`Autofill-form-extension`).
7. The extension icon (a grey puzzle piece, unless a logo is added) will now appear in your browser toolbar. Pin it for easy access!

## Usage Guide

1. **Activate the Extension**: Click the Autofill extension icon in your toolbar.
2. **Scan the Page**: The popup will automatically scan the current page for form fields and display them.
   - _Tip_: If you open a dialog window on the webpage _after_ opening the popup, click the orange **Load Fields** button to rescan the page for the new inputs.
3. **Save Your Data**: Type the information you want to repeatedly use into the corresponding fields in the popup, then click **Save Settings**. (This uses `chrome.storage.sync`, so it saves securely to your browser profile).
4. **Autofill (Whole Form)**: Click the blue **Fill All Fields** button in the popup to instantly inject your saved data into every matching field on the page.
5. **Autofill (Single Field)**: Click directly into an input field on a webpage. A small green toggle button will appear next to the field. Click it to inject data into just that specific input.

## Development

To make changes to the extension:

1. Modify the `.ts` files inside the `/src` directory.
2. Run `npm run build` to compile the TypeScript to JavaScript.
3. Go back to `chrome://extensions/` and click the circular **Reload** icon on the extension's card to apply your changes.
4. _Important_: Always Hard Refresh (`Cmd+Shift+R` or `Ctrl+Shift+R`) the webpage you are testing on after reloading the extension, otherwise the old content script will remain active.
