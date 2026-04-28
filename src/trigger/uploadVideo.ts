import { logger, task } from "@trigger.dev/sdk";
import { Transloadit } from "transloadit";

const transloadit = new Transloadit({
  authKey:    process.env.TRANSLOADIT_AUTH_KEY!,
  authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
});

export const uploadVideoTask = task({
  id: "upload-video",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { tempUrl?: string; fileBase64?: string; fileName?: string }) => {
    const { tempUrl, fileBase64, fileName = "upload.mp4" } = payload;

    if (!tempUrl && !fileBase64) {
      throw new Error("Either tempUrl or fileBase64 must be provided");
    }

    logger.log("Starting video upload to Transloadit", { fileName });

    const options: Transloadit.AssemblyOptions = {
      waitForCompletion: true,
      params: {
        steps: {
          ":original": {
            robot:  "/upload/handle",
            result: true,
          },
        },
      },
    };

    if (tempUrl) {
      options.params!.files = { file: tempUrl };
    } else if (fileBase64) {
      const buffer = Buffer.from(fileBase64, "base64");
      options.uploads = { file: buffer };
    }

    const assembly = await transloadit.createAssembly(options);

    if (assembly.error) {
      throw new Error(`Transloadit error: ${assembly.error} — ${assembly.message}`);
    }

    const uploaded = assembly.results?.[":original"]?.[0];

    if (!uploaded?.ssl_url) {
      throw new Error("Upload succeeded but no URL returned from Transloadit");
    }

    const video_url = uploaded.ssl_url;

    logger.log("Video uploaded successfully", { video_url });

    return { video_url };
  },
});
