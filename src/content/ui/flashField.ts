// src/content/ui/flashField.ts

import {
  MAGIC_FILL_BG_COLOR,
  SAVED_FILL_BG_COLOR,
} from "../../shared/constants.js";

/** Blue marks values from a saved profile; pink marks generated test data. */
export type FillKind = "saved" | "test";

const TINT: Record<FillKind, string> = {
  saved: SAVED_FILL_BG_COLOR,
  test: MAGIC_FILL_BG_COLOR,
};

const FLASH_MS = 700;

/**
 * Briefly tint a field that was just filled, so it's obvious what changed.
 * Re-entrant: a second flash on the same element won't capture the tint as
 * the element's original background.
 */
export function flashField(el: HTMLElement, kind: FillKind): void {
  if (el.dataset.autofillFlashing === "1") return;
  el.dataset.autofillFlashing = "1";

  const originalBg = el.style.backgroundColor;
  const originalTransition = el.style.transition;

  el.style.transition = "background-color 0.12s ease";
  el.style.backgroundColor = TINT[kind];

  setTimeout(() => {
    el.style.backgroundColor = originalBg;
    setTimeout(() => {
      el.style.transition = originalTransition;
      delete el.dataset.autofillFlashing;
    }, 150);
  }, FLASH_MS);
}
