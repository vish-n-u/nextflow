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
    images?: string[]; // image URLs from upstream nodes (Transloadit CDN, etc.)
  }) => {
    const { model, user_message, system_prompt, images = [] } = payload;

    logger.log("Running LLM", { model, system_prompt, imageCount: images.length });

    const geminiModel = genAI.getGenerativeModel({
      model: LLM_MODELS[model] ?? LLM_MODELS[DEFAULT_LLM_MODEL],
      ...(system_prompt ? { systemInstruction: system_prompt } : {}),
    });

    const parts: Part[] = [{ text: user_message }];

    for (const imageUrl of images) {
      // Fetch the image from the URL and convert to base64 for Gemini inlineData
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${imageUrl} (${response.status})`);
      const buffer   = await response.arrayBuffer();
      const base64   = Buffer.from(buffer).toString("base64");
      const mimeType = response.headers.get("content-type") ?? "image/jpeg";
      parts.push({
        inlineData: { mimeType, data: base64 },
      });
    }

    const result = await geminiModel.generateContent(parts);
    const output = result.response.text();

    logger.log("LLM run complete", { output });

    return { output };
  },
});
