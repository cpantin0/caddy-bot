const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
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
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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

    await wait(3000);

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
    const input = await page.waitForSelector("input[placeholder='City, Course, or Zip']", {
      timeout: 10000,
    });

    console.log(`📍 Typing location: ${location}`);
    await input.type(location);
    await page.keyboard.press("Enter");

    console.log("⏳ Waiting for results to load...");
    await wait(8000); // buffer for dynamic load

    console.log("📄 Searching for tee time cards...");

    const teeTimeSelector = ".teetime-card";
    const teeTimesExist = await page.$(teeTimeSelector);

    if (!teeTimesExist) {
      console.warn("⚠️ Tee time cards not found, capturing screenshot...");
      await page.screenshot({ path: "no_teetimes.png", fullPage: true });
      throw new Error("Tee time cards did not load.");
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

    try {
      await page.screenshot({ path: "error_state.png", fullPage: true });
      console.log("📸 Screenshot saved to error_state.png");
    } catch (screenshotErr) {
      console.error("❌ Screenshot failed:", screenshotErr);
    }

    return [];
  } finally {
    console.log("🛑 Browser closed");
    await browser.close();
  }
}

module.exports = { searchTeeTimes };
