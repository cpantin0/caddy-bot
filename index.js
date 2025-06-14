const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const { searchTeeTimes } = require("./puppeteerBot");
const { sendTelegramMessage } = require("./telegramBot");

const app = express();
app.use(bodyParser.json());

// 🏠 Health check
app.get("/", (req, res) => {
  res.send("🏌️‍♂️ Your Caddy Bot is live!");
});

// 🎯 Main booking trigger
app.post("/trigger", async (req, res) => {
  console.log("✅ /trigger endpoint hit.");
  console.log("📦 Incoming request body:", JSON.stringify(req.body, null, 2));

  try {
    const results = await searchTeeTimes(req.body);

    if (!results || results.length === 0) {
      console.warn("⚠️ No tee times found.");
      await sendTelegramMessage("⚠️ No tee times found for your search.");
      return res.status(200).send({ success: true, message: "No tee times found." });
    }

    const message =
      `🟢 Tee Times Found:\n\n` +
      results.map((r, i) => `${i + 1}. ${r.time} at ${r.course} – ${r.price}`).join("\n") +
      `\n\nReply with a number to approve.`;

    console.log("📨 Sending Telegram message:\n", message);
    await sendTelegramMessage(message);

    res.send({ success: true, results });
  } catch (error) {
    console.error("❌ Error during /trigger execution:", error);
    res.status(500).send({ success: false, error: "Internal server error" });
  }
});

// ✅ Dynamic port assignment (for Railway, Replit, etc.)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Caddy Bot server running on port ${PORT}`);
});
