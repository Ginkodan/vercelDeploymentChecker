import axios from "axios";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export const postMessageToDiscord = async (message: string) => {
  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      content: message,
    });
  } catch (error) {
    console.error(error);
  }
};
