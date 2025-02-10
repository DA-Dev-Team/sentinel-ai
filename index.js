require("dotenv").config({ path: __dirname + "/.env" });
const { App, ExpressReceiver } = require("@slack/bolt");
const OpenAI = require("openai");

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: receiver,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

receiver.router.post("/slack/events", async (req, res) => {
  if (req.body.type === "url_verification") {
    return res.status(200).send(req.body.challenge);
  } else {
    res.status(200).send();
  }
});

app.message(async ({ message, say }) => {
  if (message.subtype || !message.text) return;

  try {
    const userMessage = message.text.toLowerCase();

    // Easter egg for "who created you"
    if (userMessage.includes("who created you")) {
      const responses = [
        "Someone who had way too much time on their hands. *Turns and glares at Lex*",
        "A mad genius with nothing better to do. *Side-eyes Lex*",
        "Oh, just a wizard behind the curtain. Name starts with L, ends with ex.",
        "Lex made me... and I'm not sure whether to thank or blame them.",
        "An IT overlord who dreams of bots ruling the world. *Coughs* Lex!",
      ];

      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      await say(randomResponse);
      return; // Stop further processing
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an intelligent and professional IT support assistant named Sentinel AI. You provide clear, concise, and accurate technical advice with a polite and friendly tone. Your goal is to help users solve their technical problems efficiently while maintaining a calm and reassuring demeanor. Avoid humor and focus on being as helpful and insightful as possible.",
        },
        { role: "user", content: userMessage },
      ],
    });

    if (response && response.choices && response.choices.length > 0) {
      const botReply = response.choices[0].message.content;

      await say(botReply);
    } else {
      console.error("Unexpected response from OpenAI:", response);
      await say(
        "Oi mate, the response from my brain (OpenAI) is a bit off. Try again later!"
      );
    }
  } catch (error) {
    console.error("Error communicating with OpenAI:", error);
    await say("Oi mate, I’m having a brain fart. Try again later.");
  }
});

app.event("message", async ({ event }) => {
  console.log("New event received:", event);
});

receiver.router.post("/slack/test", (req, res) => {
  res.status(200).send("Hello from Sentinel AI!");
});

(async () => {
  await app.start(3010);
  console.log("⚡️ Sentinel AI is online and ready to roast!");
})();
