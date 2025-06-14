const puppeteer = require("puppeteer");

async function searchTeeTimes(request) {
  const {
    date,
    numPlayers,
    budget,
    walkOrCart,
    earliestTime,
    latestTime,
    location = "Los Angeles, CA" // default fallback
  } = request;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  const page = await browser.newPage();

  try {
    // Load GolfNow
    await page.goto("https://www.golfnow.com/", { waitUntil: "networkidle2" });

    // Wait for the search input
    await page.waitForSelector("input[placeholder='City, Course, or Zip']", { timeout: 60000 });

    // Fill in search field
    await page.type("input[placeholder='City, Course, or Zip']", location);
    await page.keyboard.press("Enter");

    // Give results time to load
    await page.waitForTimeout(7000);

    // Scrape results
    const teeTimes = await page.evaluate(() => {
      const cards = document.querySelectorAll(".teetime-card");
      const results = [];

      cards.forEach((card) => {
        const course = card.querySelector(".course-name")?.textContent?.trim();
        const time = card.querySelector(".time")?.textContent?.trim();
        const price = card.querySelector(".price")?.textContent?.trim();

        if (course && time && price) {
          results.push({ course, time, price });
        }
      });

      return results.slice(0, 5);
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
