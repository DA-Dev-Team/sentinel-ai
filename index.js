require("dotenv").config();
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
    const userMessage = message.text;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
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
