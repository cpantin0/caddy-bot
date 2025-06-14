const puppeteer = require("puppeteer");
const { executablePath } = require("puppeteer");

// ✅ Helper to replace page.waitForTimeout (compatible with all versions)
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
    executablePath: executablePath(), // ✅ Auto-resolves path to Chromium
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 🧠 Set desktop user-agent
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
  );

  try {
    console.log("🌐 Navigating to GolfNow...");
    await page.goto("https://www.golfnow.com/", { waitUntil: 'domcontentloaded', timeout: 30000 });

    // ⏳ Extra wait for JS-heavy site to fully hydrate
    await wait(4000);

    // ✅ Accept cookies if present
    try {
      const acceptBtn = await page.$("button[aria-label*='Accept']") || await page.$("button:has-text('Accept')");
      if (acceptBtn) {
        console.log("🍪 Accepting cookies...");
        await acceptBtn.click();
        await wait(2000);
      }
    } catch (cookieErr) {
      console.log("⚠️ No cookie button found or skipped.");
    }

    console.log("🔍 Waiting for search input field...");
    await page.waitForSelector("input[placeholder='City, Course, or Zip']", { timeout: 15000 });

    console.log(`📍 Typing location: ${location}`);
    await page.type("input[placeholder='City, Course, or Zip']", location);
    await page.keyboard.press("Enter");

    console.log("⏳ Waiting for tee times to load...");
    await wait(8000);

    console.log("📄 Waiting for tee time cards...");
    await page.waitForSelector(".teetime-card", { timeout: 15000 });

    const teeTimes = await page.evaluate(() => {
      const cards = document.querySelectorAll(".teetime-card");
      const results = [];

      cards.forEach(card => {
        const course = card.querySelector(".course-name")?.textContent?.trim();
        const time = card.querySelector(".time")?.textContent?.trim();
        const price = card.querySelector(".price")?.textContent?.trim();
        if (course && time && price) {
          results.push({ course, time, price });
        }
      });

      return results.slice(0, 5);
    });

    console.log("🏌️ Tee times scraped: ", teeTimes);
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
