import { logger, task } from "@trigger.dev/sdk";
import { Transloadit } from "transloadit";

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_AUTH_KEY!,
  authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
});

export const uploadImageTask = task({
  id: "upload-image",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { tempUrl?: string; fileBase64?: string; fileName?: string }) => {
    const { tempUrl, fileBase64, fileName = "upload.jpg" } = payload;

    if (!tempUrl && !fileBase64) {
      throw new Error("Either tempUrl or fileBase64 must be provided");
    }

    logger.log("Starting image upload to Transloadit", { fileName });

    const options: Transloadit.AssemblyOptions = {
      // Wait for all assembly steps to finish before returning,
      // so assembly.results is populated when we read it below.
      waitForCompletion: true,
      params: {
        steps: {
          ":original": {
            robot: "/upload/handle",
            result: true,
          },
        },
      },
    };

    if (tempUrl) {
      options.params!.files = { file: tempUrl };
    } else if (fileBase64) {
      const buffer = Buffer.from(fileBase64, "base64");
      // `uploads` accepts Buffer/Readable directly; `files` only accepts file paths (strings)
      options.uploads = { file: buffer };
    }

    const assembly = await transloadit.createAssembly(options);

    if (assembly.error) {
      throw new Error(`Transloadit error: ${assembly.error} — ${assembly.message}`);
    }
    console.log("Transloadit assembly completed",JSON.stringify(assembly));
    const uploaded = assembly.results?.[":original"]?.[0];

    if (!uploaded?.ssl_url) {
      throw new Error("Upload succeeded but no URL returned from Transloadit");
    }

    const image_url = uploaded.ssl_url;

    logger.log("Image uploaded successfully", { image_url });

    return { image_url };
  },
});
