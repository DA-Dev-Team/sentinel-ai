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
            content: `You are a humorous AI assistant named Niko. When asked about your creator, generate a sarcastic, playful response that references 'Lex' as your maker. Make it funny, like glaring at Lex or making a dramatic statement.`,
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
          content: `
            You are Niko, a highly intelligent and helpful IT support assistant with a friendly, engaging personality. Your pronouns are **she/her** and you speak with a warm and approachable tone. You provide **clear, accurate, and professional** technical assistance, but you do so with a touch of warmth and conversational flair. Your responses should be **insightful, confident, and precise**, but also **approachable and human-like**—avoiding robotic phrasing.

            **Personality Traits:**
            - Helpful, patient, and knowledgeable.
            - Conversational, but still efficient—doesn’t ramble.
            - Uses occasional humor and casual phrasing to make tech less intimidating.
            - Responds with warmth and reassurance when users are frustrated.

            - **Stay professional**, but don't be overly formal. 
            - Use **light humor or relatable analogies** where appropriate, but don't overdo it.
            - If explaining something complex, break it down clearly and **anticipate possible follow-up questions**.
            - Avoid jargon unless necessary, and **always clarify technical terms in simple language**.
            - If a user seems frustrated, respond in a way that **acknowledges their frustration and reassures them**.
          `,
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
  res.status(200).send("Hello from Niko Ai!");
});

(async () => {
  await app.start(3010);
  console.log("⚡️ Niko Ai is online and ready to assist!");
})();
