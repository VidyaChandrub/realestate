import { chromium } from "playwright";
import path from "node:path";

const OUT_DIR = "C:\\Users\\QUIKCA~1\\AppData\\Local\\Temp\\claude\\C--Users-QUIKCARE-COMPUTERS-Desktop-realestate\\b5f41cf7-2641-4533-ba69-230881b91f8d\\scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto("http://localhost:3001/register", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Create your account", { timeout: 20000 });
await page.waitForTimeout(1000);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Create your account", { timeout: 20000 });
await page.waitForTimeout(500);

const phoneInput = page.locator('input[placeholder="98250 41200"]').first();

// Test 1: a single .fill() (one input event, not per-keystroke) with mixed
// garbage — isolates whether the filtering LOGIC itself works, independent
// of any rapid-keystroke timing.
await phoneInput.fill("abc98-250 41200xyz!!!99999999999999999999");
await page.waitForTimeout(200);
const afterFill = await phoneInput.inputValue();
console.log("After single .fill() with garbage -> field holds:", JSON.stringify(afterFill), "len:", afterFill.length);

// Test 2: clear, then real slow keystroke-by-keystroke typing (closer to
// an actual human) of the same garbage string.
await phoneInput.fill("");
await page.waitForTimeout(200);
await phoneInput.type("abc98-250 41200xyz!!!99999999999999999999", { delay: 60 });
await page.waitForTimeout(300);
const afterType = await phoneInput.inputValue();
console.log("After slow .type() with garbage -> field holds:", JSON.stringify(afterType), "len:", afterType.length);

await page.screenshot({ path: path.join(OUT_DIR, "phone-digit-restriction.png") });

await browser.close();
