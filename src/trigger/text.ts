import { logger, task } from "@trigger.dev/sdk";

export const textTask = task({
  id: "text",
  run: async (payload: { text: string }) => {
    const { text } = payload;
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate async work

    logger.log("Text node", { text });

    return { output: text };
  },
});
