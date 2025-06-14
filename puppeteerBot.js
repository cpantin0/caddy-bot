const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");

puppeteer.use(StealthPlugin());

async function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function searchTeeTimes(request) {
  const { location, date, earliestTime, latestTime, walkOrCart } = request;

  console.log("🚀 Launching headless browser...");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  // Patch headless fingerprinting
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
  );

  try {
    console.log("🌐 Navigating to GolfNow search page...");
    await page.goto("https://www.golfnow.com/tee-times/search", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await wait(4000);

    // Accept cookies
    try {
      const acceptBtn = await page.$("button[aria-label*='Accept'], button:has-text('Accept')");
      if (acceptBtn) {
        console.log("🍪 Accepting cookies...");
        await acceptBtn.click();
        await wait(1000);
      }
    } catch {
      console.log("⚠️ Cookie acceptance skipped or failed gracefully.");
    }

    // Force reload to beat hydration fallback
    await page.reload({ waitUntil: "domcontentloaded" });
    await wait(4000);

    // Retry with alternative selector
    const inputSelector = "input[type='search'], input[placeholder*='City'], input[aria-label*='search']";

    console.log("🔍 Waiting for location input...");
    const input = await page.waitForSelector(inputSelector, { timeout: 15000 });

    console.log(`📍 Typing location: ${location}`);
    await input.type(location);
    await page.keyboard.press("Enter");

    console.log("⏳ Waiting for search results...");
    await wait(8000);

    const teeTimeSelector = ".teetime-card";
    const teeTimesExist = await page.$(teeTimeSelector);

    if (!teeTimesExist) {
      console.warn("⚠️ Tee time cards not found, capturing screenshot...");
      const buffer = await page.screenshot({ fullPage: true });
      console.log("🖼️ Screenshot (base64):", buffer.toString("base64"));
      throw new Error("Tee time cards not found on search results page.");
    }

    await page.waitForSelector(teeTimeSelector, { timeout: 10000 });

    const teeTimes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".teetime-card"))
        .slice(0, 5)
        .map((card) => ({
          course: card.querySelector(".course-name")?.textContent?.trim(),
          time: card.querySelector(".time")?.textContent?.trim(),
          price: card.querySelector(".price")?.textContent?.trim(),
        }))
        .filter((t) => t.course && t.time && t.price);
    });

    console.log("🏌️ Tee times scraped:", teeTimes);
    return teeTimes;
  } catch (err) {
    console.error("❌ Scraping error:", err);
    const html = await page.content();
    console.log("🕵️ Page HTML snapshot:\n", html.slice(0, 1000));
    return [];
  } finally {
    console.log("🛑 Browser closed");
    await browser.close();
  }
}

module.exports = { searchTeeTimes };
