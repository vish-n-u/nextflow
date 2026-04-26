import { logger, task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL_IDS: Record<string, string> = {
  "Gemini 1.5 Flash": "gemini-1.5-flash",
  "Gemini 1.5 Pro": "gemini-1.5-pro",
};

export const runLLMTask = task({
  id: "run-llm",
  run: async (payload: {
    model: "Gemini 1.5 Flash" | "Gemini 1.5 Pro";
    user_message: string;
    system_prompt?: string;
    images?: string[]; // base64-encoded images
  }) => {
    const { model, user_message, system_prompt, images = [] } = payload;

    logger.log("Running LLM", { model, system_prompt, imageCount: images.length });

    const geminiModel = genAI.getGenerativeModel({
      model: MODEL_IDS[model] ?? "gemini-1.5-flash",
      ...(system_prompt ? { systemInstruction: system_prompt } : {}),
    });

    const parts: Part[] = [{ text: user_message }];

    for (const imageBase64 of images) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      });
    }

    const result = await geminiModel.generateContent(parts);
    const output = result.response.text();

    logger.log("LLM run complete", { output });

    return { output };
  },
});
