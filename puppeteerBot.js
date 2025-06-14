const puppeteer = require("puppeteer");

async function searchTeeTimes(request) {
  const {
    date,
    location = "Los Angeles",
    numPlayers,
    budget,
    walkOrCart,
    earliestTime,
    latestTime
  } = request;

  console.log("🚀 Launching headless browser...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  const page = await browser.newPage();

  try {
    console.log("🌐 Navigating to GolfNow...");
    await page.goto("https://www.golfnow.com/", { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("🔍 Waiting for search input field...");
    await page.waitForSelector("input[placeholder*='City']", { timeout: 60000 });

    console.log(`📍 Typing location: ${location}`);
    await page.type("input[placeholder*='City']", location);
    await page.keyboard.press("Enter");

    console.log("⏳ Waiting for tee times to load...");
    await page.waitForTimeout(8000); // Adjust if needed

    console.log("📋 Extracting tee times...");
    const teeTimes = await page.evaluate(() => {
      const cards = document.querySelectorAll(".teetime-card");
      let results = [];

      cards.forEach(card => {
        const course = card.querySelector(".course-name")?.textContent?.trim();
        const time = card.querySelector(".time")?.textContent?.trim();
        const price = card.querySelector(".price")?.textContent?.trim();

        if (course && time && price) {
          results.push({ course, time, price });
        }
      });

      return results.slice(0, 5); // top 5 for now
    });

    console.log("✅ Tee times scraped:", teeTimes);
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
