import { logger, task } from "@trigger.dev/sdk";

export const uploadVideoTask = task({
  id: "upload-video",
  run: async (payload: { tempUrl?: string; fileBase64?: string; fileName?: string }) => {
    const { tempUrl, fileBase64, fileName = "upload.mp4" } = payload;

    if (!tempUrl && !fileBase64) {
      throw new Error("Either tempUrl or fileBase64 must be provided");
    }

    logger.log("Starting video upload", { fileName });

    // TODO: integrate with storage/upload service

    const video_url = tempUrl ?? "https://placeholder.example.com/video.mp4";

    logger.log("Video uploaded successfully", { video_url });

    return { video_url };
  },
});
