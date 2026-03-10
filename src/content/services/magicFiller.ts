// src/content/services/magicFiller.ts

import { getAllInputs } from "./fieldDetector.js";
import {
  IGNORED_INPUT_TYPES,
  MAGIC_FILL_BG_COLOR,
} from "../../shared/constants.js";

/**
 * Random option selection for select elements
 */
function getRandomSelectValue(select: HTMLSelectElement): string {
  const options = Array.from(select.options);
  console.log("SELECT DEBUG: Total options:", options.length);
  console.log(
    "SELECT DEBUG: Option values:",
    options.map((o) => ({ value: o.value, text: o.textContent })),
  );

  // Filter out empty/placeholder options
  const validOptions = options.filter(
    (o) =>
      o.value &&
      o.value.toLowerCase() !== "select" &&
      o.textContent?.toLowerCase() !== "select",
  );

  console.log("SELECT DEBUG: Valid options:", validOptions.length);
  console.log(
    "SELECT DEBUG: Valid option values:",
    validOptions.map((o) => ({ value: o.value, text: o.textContent })),
  );

  if (validOptions.length === 0) {
    console.log("SELECT DEBUG: No valid options found!");
    return "";
  }

  // Pick a random option
  const randomIdx = Math.floor(Math.random() * validOptions.length);
  const randomOption = validOptions[randomIdx];
  console.log(
    "SELECT DEBUG: Selected option index:",
    randomIdx,
    "value:",
    randomOption?.value,
  );
  return randomOption?.value || "";
}

/**
 * Fill all fields with random test data
 */
export function magicFillAllFields(): void {
  const allInputs = getAllInputs();
  console.log("MAGIC FILL DEBUG: Total elements found:", allInputs.length);
  console.log(
    "MAGIC FILL DEBUG: Elements:",
    allInputs.map((el) => ({
      tagName: el.tagName,
      type: (el as any).type,
      name: el.name,
      id: el.id,
    })),
  );
  allInputs.forEach((el) => {
    const type =
      el instanceof HTMLSelectElement
        ? "select"
        : (el as HTMLInputElement).type?.toLowerCase();
    if (!IGNORED_INPUT_TYPES.includes(type as any)) {
      const input = el as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement;
      const nameAttr = (
        input.name ||
        input.id ||
        (input instanceof HTMLInputElement ? input.placeholder : "") ||
        "text"
      ).toLowerCase();
      let fakeData = "";

      switch (true) {
        case nameAttr.includes("email") || type === "email":
          fakeData = `testuser_${Math.floor(Math.random() * 10000)}@example.com`;
          break;
        case nameAttr.includes("phone") ||
          nameAttr.includes("tel") ||
          type === "tel":
          fakeData = `${Math.floor(100000 + Math.random() * 900000)}`;
          break;
        case nameAttr.includes("first") ||
          nameAttr.includes("fname") ||
          nameAttr.includes("f_name"): {
          const firsts = [
            "Alex",
            "Jordan",
            "Taylor",
            "Casey",
            "Riley",
            "Sam",
            "Jamie",
          ];
          fakeData = firsts[
            Math.floor(Math.random() * firsts.length)
          ] as string;
          break;
        }
        case nameAttr.includes("last") ||
          nameAttr.includes("lname") ||
          nameAttr.includes("l_name"): {
          const lasts = ["Smith", "Doe", "Johnson", "Brown", "Miller", "Davis"];
          fakeData = lasts[Math.floor(Math.random() * lasts.length)] as string;
          break;
        }
        case nameAttr.includes("name_kh") ||
          nameAttr.includes("name_km") ||
          nameAttr.includes("khname") ||
          nameAttr.includes("kmname") ||
          nameAttr.includes("nameKm"):
          const name_km = [
            "សេរី",
            "វិជ្ជា",
            "សុវណ្ណ",
            "រិទ្ធី",
            "ណារិទ្ធ",
            "បុរី",
            "វិសាល",
            "ដារារិទ្ធ",
            "ឧត្តម",
            "ភារុណ",
            "បុប្ផា",
            "ស្រីនាង",
            "កល្យាណ",
            "ទេវី",
            "ឆវី",
            "នារី",
            "លក្ខិណា",
            "សុរិយ័ន",
            "ចំរើន",
            "វណ្ណារី",
          ];
          fakeData = name_km[
            Math.floor(Math.random() * name_km.length)
          ] as string;
          break;
        case nameAttr.includes("company") || nameAttr.includes("companyNameKm") || nameAttr.includes("org"): {
          const company_name_kh = [
            "ធនាគារ អេស៊ីលីដា",
            "ធនាគារ កាណាឌីយ៉ា",
            "ក្រុមហ៊ុន ជីប ម៉ុង",
            "ក្រុមហ៊ុន រ៉ូយ៉ាល់ គ្រុប",
            "ធនាគារ វឌ្ឍនៈ",
            "ក្រុមហ៊ុន សែលកាត",
            "ធនាគារ វីង",
            "ធនាគារ អេប៊ីអេ (ABA)",
            "ក្រុមហ៊ុន ខ្មែរ ប៊ែវើរីជីស",
            "រោងចក្រស្រាបៀរ កម្ពុជា",
            "កំពង់ផែស្វយ័តក្រុងព្រះសីហនុ",
            "រដ្ឋាករទឹកស្វយ័តក្រុងភ្នំពេញ",
            "ក្រុមហ៊ុន អុីហ្សុីខម (EZECOM)",
            "ក្រុមហ៊ុន ភេសជ្ជៈកម្ពុជា (Coca-Cola)",
            "ធនាគារ ហត្ថា",
            "ក្រុមហ៊ុន សូគីម៉ិច",
            "ក្រុមហ៊ុន ហ្គ្រេនធ្វីន អ៊ិនធើណេសិនណល",
            "ក្រុមហ៊ុន ម៉េងលី ជេ. គួច អប់រំ",
            "សហគ្រាសផលិតទឹកស្អាតកម្ពុជា",
            "ក្រុមហ៊ុន បុរី ភ្នំពេញថ្មី",
          ];
          fakeData = company_name_kh[
            Math.floor(Math.random() * company_name_kh.length)
          ] as string;
          break;
        }
        case nameAttr.includes("companyNameEn") || nameAttr.includes("companyEn"): {
          const company_name_en = [
            "ABA Bank",
            "Smart Axiata",
            "Cellcard",
            "Canadia Bank",
            "Chip Mong Group",
            "Royal Group",
            "EZECOM",
            "Prasac Microfinance",
            "Sathapana Bank",
            "Wing Bank",
            "Nexus Tech Solutions",
            "Quantum Digital Academy",
            "Apex Global Consulting",
            "Vanguard Software Group",
            "Sterling Financial Services",
            "Blue Horizon Ventures",
            "Summit Education Center",
            "Pinnacle Creative Agency",
            "Ironclad Cybersecurity",
            "Velocity Logistics",
          ];
          fakeData = company_name_en[
            Math.floor(Math.random() * company_name_en.length)
          ] as string;
          break;
        }
        case nameAttr.includes("name"):
          fakeData = `Alex Doe`;
          break;
        // case nameAttr.includes("company") || nameAttr.includes("org"):
        //   fakeData = `TestCorp Solutions Ltd`;
        //   break;

        case nameAttr.includes("address") || nameAttr.includes("street"):
          fakeData = `${Math.floor(10 + Math.random() * 9990)} Main St`;
          break;
        case nameAttr.includes("city"):
          fakeData = `Metropolis`;
          break;
        case nameAttr.includes("zip") || nameAttr.includes("postal"):
          fakeData = `${Math.floor(10000 + Math.random() * 90000)}`;
          break;
        case nameAttr.includes("pass") || type === "password":
          fakeData = `TestPass123!`;
          break;
        case type === "radio": {
          // For radio buttons, select a RANDOM one with the same name
          const radioGroup = document.querySelectorAll(
            `input[type="radio"][name="${input.name}"]`,
          );
          if (radioGroup.length > 0) {
            // Pick a random radio button
            const randomIdx = Math.floor(Math.random() * radioGroup.length);
            const selectedRadio = radioGroup[randomIdx] as HTMLInputElement;
            selectedRadio.checked = true;
            selectedRadio.dispatchEvent(new Event("change", { bubbles: true }));
            console.log(
              `Radio: Selected random option ${randomIdx + 1} of ${radioGroup.length}`,
            );
          }
          // Visual feedback
          const originalBg = (input as HTMLInputElement).style.backgroundColor;
          (input as HTMLInputElement).style.backgroundColor =
            MAGIC_FILL_BG_COLOR;
          setTimeout(() => {
            (input as HTMLInputElement).style.backgroundColor = originalBg;
          }, 800);
          return; // Skip the generic value setting below
        }
        case type === "checkbox": {
          // For checkboxes, randomly decide to check or uncheck
          const checkboxGroup = document.querySelectorAll(
            `input[type="checkbox"][name="${input.name}"]`,
          );
          if (checkboxGroup.length > 0) {
            // Pick random checkboxes to check (25-75% of them)
            const numToCheck = Math.max(
              1,
              Math.floor(checkboxGroup.length * (0.25 + Math.random() * 0.5)),
            );
            const indices = Array.from(
              { length: checkboxGroup.length },
              (_, i) => i,
            );

            // Shuffle using Fisher-Yates
            for (let i = indices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              const tempIdx = indices[i];
              if (tempIdx !== undefined) {
                indices[i] = indices[j] || 0;
                indices[j] = tempIdx;
              }
            }

            // Uncheck all first
            checkboxGroup.forEach((cb) => {
              (cb as HTMLInputElement).checked = false;
            });

            // Check selected ones
            for (let i = 0; i < numToCheck && i < indices.length; i++) {
              const idx = indices[i];
              if (idx !== undefined) {
                const checkbox = checkboxGroup[idx] as HTMLInputElement;
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }
            console.log(
              `Checkbox: Randomly checked ${numToCheck} of ${checkboxGroup.length}`,
            );
          } else {
            // Standalone checkbox - randomly check/uncheck
            (input as HTMLInputElement).checked = Math.random() > 0.5;
          }
          (input as HTMLInputElement).dispatchEvent(
            new Event("change", { bubbles: true }),
          );
          // Visual feedback
          const originalCheckboxBg = (input as HTMLInputElement).style
            .backgroundColor;
          (input as HTMLInputElement).style.backgroundColor =
            MAGIC_FILL_BG_COLOR;
          setTimeout(() => {
            (input as HTMLInputElement).style.backgroundColor =
              originalCheckboxBg;
          }, 800);
          return; // Skip the generic value setting below
        }
        case type === "select": {
          // Random select option selection
          if (input instanceof HTMLSelectElement) {
            console.log("SELECT DEBUG: Processing select field:", nameAttr);
            fakeData = getRandomSelectValue(input);
            console.log("SELECT DEBUG: Selected value:", fakeData);
            input.value = fakeData;
            console.log(
              "SELECT DEBUG: After setting, input.value =",
              input.value,
            );
            console.log("SELECT DEBUG: Selected index:", input.selectedIndex);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            // Visual feedback
            const originalSelectBg = input.style.backgroundColor;
            input.style.backgroundColor = MAGIC_FILL_BG_COLOR;
            setTimeout(() => {
              input.style.backgroundColor = originalSelectBg;
            }, 800);
            return; // Skip generic value setting below
          }
          break;
        }
        case input.tagName === "TEXTAREA" ||
          nameAttr.includes("desc") ||
          nameAttr.includes("msg") ||
          nameAttr.includes("message"):
          fakeData = `This is some auto-generated test data for ${nameAttr}. It helps developers quickly test form submissions. \n\nRandom ID: ${Math.random().toString(36).substring(2, 8)}`;
          break;
        case type === "number":
          fakeData = `${Math.floor(1 + Math.random() * 10000)}`;
          break;
        case type === "date": {
          const d = new Date();
          fakeData = d.toISOString().split("T")[0] as string;
          break;
        }
        default:
          // Generic fallback
          fakeData = `Test-${Math.floor(Math.random() * 1000)}`;
          break;
      }

      input.value = fakeData;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      // Visual feedback only for input/textarea
      if (
        input instanceof HTMLInputElement ||
        input instanceof HTMLTextAreaElement
      ) {
        const originalBg = input.style.backgroundColor;
        input.style.backgroundColor = MAGIC_FILL_BG_COLOR;
        setTimeout(() => {
          input.style.backgroundColor = originalBg;
        }, 800);
      }
    }
  });
  console.log("Autofill Extension: Magic fill completed");
}
