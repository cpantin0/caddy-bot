const puppeteer = require("puppeteer");
const { executablePath } = require("puppeteer"); // ✅ use Puppeteer's bundled Chromium

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
    executablePath: executablePath(), // ✅ dynamically resolves correct Chromium path
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log("🌐 Navigating to GolfNow...");
    await page.goto("https://www.golfnow.com/", { waitUntil: 'networkidle2' });

    console.log("🔍 Waiting for search input field...");
    await page.waitForSelector("input[placeholder='City, Course, or Zip']", { timeout: 15000 });

    console.log(`📍 Typing location: ${location}`);
    await page.type("input[placeholder='City, Course, or Zip']", location);
    await page.keyboard.press("Enter");

    console.log("⏳ Waiting for tee times to load...");
    await page.waitForTimeout(8000);

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
