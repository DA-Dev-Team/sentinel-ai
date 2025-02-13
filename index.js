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

    // Check if the message is asking about Sentinel AI's creator
    const creatorKeywords = [
      "who created you",
      "who made you",
      "who built you",
      "who designed you",
      "who programmed you",
      "who is your creator",
    ];
    if (creatorKeywords.some((keyword) => userMessage.includes(keyword))) {
      // Generate a dynamic and funny response referencing Lex
      const creatorResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a humorous AI assistant. When asked about your creator, generate a sarcastic, playful response that references 'Lex' as your maker. Make it funny, like glaring at Lex or making a dramatic statement.`,
          },
          { role: "user", content: userMessage },
        ],
      });

      if (creatorResponse?.choices?.length > 0) {
        const botReply = creatorResponse.choices[0].message.content;
        await say(botReply);
        return; // Stop further processing
      } else {
        console.error("Unexpected response from OpenAI:", creatorResponse);
        await say(
          "I'm not sure who made me... but I suspect it involves an evil genius named Lex. 🤔"
        );
        return;
      }
    }

    // Default OpenAI response for other questions
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an intelligent and professional IT support assistant named Sentinel AI. You provide clear, concise, and accurate technical advice with a polite and friendly tone.",
        },
        { role: "user", content: userMessage },
      ],
    });

    if (response?.choices?.length > 0) {
      const botReply = response.choices[0].message.content;
      await say(botReply);
    } else {
      console.error("Unexpected response from OpenAI:", response);
      await say("I'm having a bit of a brain freeze. Try again later!");
    }
  } catch (error) {
    console.error("Error communicating with OpenAI:", error);
    await say("Oops, something went wrong on my end. Try again later!");
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
