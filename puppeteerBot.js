const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");

puppeteer.use(StealthPlugin());

// ✅ Helper to simulate a wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchTeeTimes(request) {
  const {
    location,
    date,
    earliestTime,
    latestTime,
    walkOrCart
  } = request;

  console.log("🚀 Launching headless browser...");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 🧠 Use common browser headers
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log("🌐 Navigating to GolfNow...");
    await page.goto("https://www.golfnow.com/", { waitUntil: "networkidle2", timeout: 30000 });

    // ⏳ Wait for hydration
    await wait(5000);

    // 🍪 Accept cookies if needed
    try {
      const cookieBtn = await page.$("button[aria-label*='Accept'], button:text('Accept')");
      if (cookieBtn) {
        console.log("🍪 Accepting cookies...");
        await cookieBtn.click();
        await wait(2000);
      }
    } catch (err) {
      console.log("⚠️ No cookie banner found or skipped.");
    }

    console.log("🔍 Waiting for search input...");
    await page.waitForSelector("input[placeholder='City, Course, or Zip']", { timeout: 15000 });

    console.log(`📍 Typing location: ${location}`);
    await page.type("input[placeholder='City, Course, or Zip']", location, { delay: 100 });
    await page.keyboard.press("Enter");

    console.log("⏳ Waiting for results...");
    await wait(10000);

    console.log("📄 Looking for tee time cards...");
    await page.waitForSelector(".teetime-card", { timeout: 15000 });

    const teeTimes = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll(".teetime-card").forEach(card => {
        const course = card.querySelector(".course-name")?.textContent?.trim();
        const time = card.querySelector(".time")?.textContent?.trim();
        const price = card.querySelector(".price")?.textContent?.trim();
        if (course && time && price) results.push({ course, time, price });
      });
      return results.slice(0, 5);
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
