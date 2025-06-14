// puppeteerBot.js

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");

puppeteer.use(StealthPlugin());

async function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function searchTeeTimes({ location, date, earliestTime, latestTime, walkOrCart }) {
  console.log("🚀 Launching headless browser...");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  // Patch headless fingerprinting
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  // Desktop viewport + UA
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/113.0.0.0 Safari/537.36"
  );

  try {
    console.log("🌐 Navigating to GolfNow search page...");
    await page.goto("https://www.golfnow.com/tee-times/search", {
      waitUntil: "networkidle2",
      timeout: 30000
    });
    await wait(3000);

    // Accept cookies if present
    try {
      const btn = await page.$("button#onetrust-accept-btn-handler");
      if (btn) {
        console.log("🍪 Accepting cookies…");
        await btn.click();
        await wait(1000);
      }
    } catch {}

    // Reload to ensure hydration
    await page.reload({ waitUntil: "domcontentloaded" });
    await wait(2000);

    // Find & fill location input with fallbacks
    console.log("🔍 Locating search input…");
    const inputSelectors = [
      "input[placeholder*='City']",
      "input[type='search']",
      "input[aria-label*='search']"
    ];
    let inputHandle = null;
    for (let sel of inputSelectors) {
      try {
        inputHandle = await page.waitForSelector(sel, { timeout: 5000 });
        if (inputHandle) break;
      } catch {}
    }
    if (!inputHandle) throw new Error("Search input not found");

    console.log(`📍 Typing location: ${location}`);
    await inputHandle.click({ clickCount: 3 });
    await inputHandle.type(location, { delay: 100 });
    await page.keyboard.press("Enter");

    console.log("⏳ Waiting for search results…");
    await wait(8000);

    // Look for tee-time cards with multiple selectors
    const cardSelectors = [
      "[data-testid='teetime-card']",
      ".teetime-card",
      "[class*='tee-time-card']"
    ];
    let cards = [];
    for (let sel of cardSelectors) {
      cards = await page.$$(sel);
      if (cards.length) {
        console.log(`✅ Found cards with selector: ${sel}`);
        break;
      }
    }
    if (!cards.length) {
      console.warn("⚠️ No tee-time cards found — capturing screenshot & HTML snippet");
      const shot = await page.screenshot({ encoding: "base64", fullPage: true });
      console.log("📸 Screenshot (base64):", shot);
      console.log("📰 HTML snippet:", (await page.content()).slice(0, 1000));
      throw new Error("Tee-time cards did not load");
    }

    // Extract up to 5
    const teeTimes = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel))
        .slice(0, 5)
        .map(card => ({
          course: card.querySelector(".course-name")?.innerText.trim() || null,
          time:   card.querySelector(".time")?.innerText.trim()       || null,
          price:  card.querySelector(".price")?.innerText.trim()      || null
        }))
        .filter(t => t.course && t.time && t.price);
    }, cardSelectors.find(sel => cards.length));

    console.log("🏌️ Tee times scraped:", teeTimes);
    return teeTimes;
  } catch (err) {
    console.error("❌ Scraping error:", err);
    return [];
  } finally {
    await browser.close();
    console.log("🛑 Browser closed");
  }
}

module.exports = { searchTeeTimes };
