const puppeteer = require("puppeteer");

async function searchTeeTimes(request) {
  const {
    date,
    numPlayers,
    budget,
    walkOrCart,
    earliestTime,
    latestTime
  } = request;

  // 🛠 FIX: Add args to run in Railway safely
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Example: GolfNow guest search
    await page.goto("https://www.golfnow.com/");
    await page.waitForSelector("input[placeholder='City, Course, or Zip']");

    // Fill search field (for now default to "Los Angeles, CA")
    await page.type("input[placeholder='City, Course, or Zip']", "Los Angeles, CA");
    await page.keyboard.press("Enter");

    // Wait for tee times to load
    await page.waitForTimeout(5000); // may need tweaking

    // Extract tee times (simplified for now)
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

      return results.slice(0, 5); // return top 5 results for now
    });

    return teeTimes;
  } catch (err) {
    console.error("Scraping error:", err);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { searchTeeTimes };
