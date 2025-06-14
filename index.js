{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;\f1\fnil\fcharset0 AppleColorEmoji;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww15920\viewh16080\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const express = require("express");\
const bodyParser = require("body-parser");\
require("dotenv").config();\
\
const \{ searchTeeTimes \} = require("./puppeteerBot");\
const \{ sendTelegramMessage \} = require("./telegramBot");\
\
const app = express();\
app.use(bodyParser.json());\
\
// 
\f1 \uc0\u55356 \u57312 
\f0  Home route for debug checks\
app.get("/", (req, res) => \{\
  res.send("
\f1 \uc0\u55356 \u57292 \u65039 \u8205 \u9794 \u65039 
\f0  Your Caddy Bot is live!");\
\});\
\
// 
\f1 \uc0\u55356 \u57263 
\f0  Main trigger route for booking requests\
app.post("/trigger", async (req, res) => \{\
  try \{\
    console.log("
\f1 \uc0\u9989 
\f0  Trigger hit!");\
    console.log(req.body); // Log incoming request for debugging\
\
    const results = await searchTeeTimes(req.body);\
\
    // Format the tee time message\
    const message = `
\f1 \uc0\u55357 \u57314 
\f0  Tee Times Found:\\n` + results\
      .map((r, i) => `$\{i + 1\}. $\{r.time\} at $\{r.course\} \'96 $\{r.price\}`)\
      .join("\\n") + `\\n\\nReply with a number to approve.`;\
\
    await sendTelegramMessage(message);\
\
    res.send(\{ success: true \});\
  \} catch (error) \{\
    console.error("
\f1 \uc0\u10060 
\f0  Error in /trigger:", error);\
    res.status(500).send("Error processing tee time search");\
  \}\
\});\
\
// 
\f1 \uc0\u9989 
\f0  Replit-compatible dynamic port assignment\
const PORT = process.env.PORT || 8080;\
app.listen(PORT, () => \{\
  console.log(`
\f1 \uc0\u55357 \u56960 
\f0  Bot is live on port $\{PORT\}`);\
\});\
}