import { logger, task } from "@trigger.dev/sdk";

export const textTask = task({
  id: "text",
  run: async (payload: { text: string }) => {
    const { text } = payload;

    logger.log("Text node", { text });

    return { output: text };
  },
});
