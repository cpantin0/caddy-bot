const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const { searchTeeTimes } = require("./puppeteerBot");
const { sendTelegramMessage } = require("./telegramBot");

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("🏌️‍♂️ Your Caddy Bot is live!");
});

app.post("/trigger", async (req, res) => {
  try {
    console.log("✅ Trigger hit!");
    console.log(req.body);

    const results = await searchTeeTimes(req.body);

    const message = `🟢 Tee Times Found:\n` + results
      .map((r, i) => `${i + 1}. ${r.time} at ${r.course} – ${r.price}`)
      .join("\n") + `\n\nReply with a number to approve.`;

    await sendTelegramMessage(message);

    res.send({ success: true });
  } catch (error) {
    console.error("❌ Error in /trigger:", error);
    res.status(500).send("Error processing tee time search");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Bot is live on port ${PORT}`);
});


