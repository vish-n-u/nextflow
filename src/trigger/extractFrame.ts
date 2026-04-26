import { logger, task } from "@trigger.dev/sdk";

export const extractFrameTask = task({
  id: "extract-frame",
  run: async (payload: { video_url: string; timestamp?: string }) => {
    const { video_url, timestamp = "0" } = payload;

    logger.log("Extracting frame from video", { video_url, timestamp });

    // TODO: integrate with video processing service (e.g. Transloadit, FFmpeg)

    const image_url = "https://placeholder.example.com/frame.jpg"; // placeholder

    logger.log("Frame extracted successfully", { image_url });

    return { image_url };
  },
});
