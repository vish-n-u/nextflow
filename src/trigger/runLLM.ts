import { logger, task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { LLM_MODELS, LLMModelName, DEFAULT_LLM_MODEL } from "../lib/models";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const runLLMTask = task({
  id: "run-llm",
  run: async (payload: {
    model: LLMModelName;
    user_message: string;
    system_prompt?: string;
    images?: string[]; // base64-encoded images
  }) => {
    const { model, user_message, system_prompt, images = [] } = payload;

    logger.log("Running LLM", { model, system_prompt, imageCount: images.length });

    const geminiModel = genAI.getGenerativeModel({
      model: LLM_MODELS[model] ?? LLM_MODELS[DEFAULT_LLM_MODEL],
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
