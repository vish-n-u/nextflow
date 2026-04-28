import { logger, task } from "@trigger.dev/sdk";
import { Transloadit } from "transloadit";

const transloadit = new Transloadit({
  authKey:    process.env.TRANSLOADIT_AUTH_KEY!,
  authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
});

export const extractFrameTask = task({
  id: "extract-frame",
  retry: { maxAttempts: 3 },
  run: async (payload: { video_url: string; timestamp?: string }) => {
    const { video_url, timestamp = "0" } = payload;

    if (!video_url) throw new Error("video_url is required");

    logger.log("Extracting frame via Transloadit", { video_url, timestamp });

    // Transloadit /video/thumbs:
    //   offsets  — array of integers (seconds)
    //   positions — array of percentage strings e.g. ["50%"]
    const isPercent = timestamp.trim().endsWith("%");
    const thumbStep: Record<string, unknown> = {
      robot:  "/video/thumbs",
      use:    "imported",
      count:  1,
      result: true,
      format: "jpg",
    };

    if (isPercent) {
      thumbStep.positions = [timestamp.trim()];
    } else {
      const seconds = parseFloat(timestamp);
      thumbStep.offsets = [isNaN(seconds) ? 0 : Math.floor(seconds)];
    }

    const assembly = await transloadit.createAssembly({
      waitForCompletion: true,
      params: {
        steps: {
          imported: {
            robot: "/http/import",
            url:   video_url,
          },
          frame: thumbStep,
        },
      },
    });

    if (assembly.error) {
      throw new Error(`Transloadit error: ${assembly.error} — ${assembly.message}`);
    }

    const extracted = assembly.results?.frame?.[0];
    if (!extracted?.ssl_url) {
      throw new Error("Extraction succeeded but no URL returned from Transloadit");
    }

    const image_url = extracted.ssl_url;
    logger.log("Frame extracted successfully", { image_url });
    return { image_url };
  },
});
