const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");

puppeteer.use(StealthPlugin());

async function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function searchTeeTimes(request) {
  const { location, date, earliestTime, latestTime, walkOrCart } = request;

  console.log("🚀 Launching headless browser...");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
  );

  try {
    console.log("🌐 Navigating to GolfNow...");
    await page.goto("https://www.golfnow.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await wait(3000); // instead of page.waitForTimeout

    // Accept cookies (optional)
    try {
      const acceptBtn = await page.$("button[aria-label*='Accept'], button:has-text('Accept')");
      if (acceptBtn) {
        console.log("🍪 Clicking cookie button...");
        await acceptBtn.click();
        await wait(1000);
      } else {
        console.log("⚠️ No cookie banner found or skipped.");
      }
    } catch {
      console.log("⚠️ Cookie acceptance failed gracefully.");
    }

    console.log("🔍 Waiting for search input...");
    const inputSelectors = [
      "input[placeholder='City, Course, or Zip']",
      "input[type='search']",
      "input[name*='search']"
    ];

    let searchInput;
    for (const selector of inputSelectors) {
      try {
        searchInput = await page.waitForSelector(selector, { timeout: 5000 });
        if (searchInput) break;
      } catch {}
    }

    if (!searchInput) throw new Error("🔎 Search input not found.");

    console.log(`📍 Typing location: ${location}`);
    await searchInput.type(location);
    await page.keyboard.press("Enter");
    await wait(8000); // instead of page.waitForTimeout

    console.log("📄 Waiting for tee time cards...");
    await page.waitForSelector(".teetime-card", { timeout: 15000 });

    const teeTimes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".teetime-card"))
        .slice(0, 5)
        .map(card => ({
          course: card.querySelector(".course-name")?.textContent?.trim(),
          time: card.querySelector(".time")?.textContent?.trim(),
          price: card.querySelector(".price")?.textContent?.trim()
        }))
        .filter(t => t.course && t.time && t.price);
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
