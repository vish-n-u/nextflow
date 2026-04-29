import { logger, task } from "@trigger.dev/sdk";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { Transloadit } from "transloadit";

const execFileAsync = promisify(execFile);

const transloadit = new Transloadit({
  authKey:    process.env.TRANSLOADIT_AUTH_KEY!,
  authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
});

export const cropImageTask = task({
  id: "crop-image",
  retry: { maxAttempts: 3 },
  run: async (payload: {
    image_url:       string;
    x_percent?:      number;
    y_percent?:      number;
    width_percent?:  number;
    height_percent?: number;
  }) => {
    const {
      image_url,
      x_percent      = 0,
      y_percent      = 0,
      width_percent  = 100,
      height_percent = 100,
    } = payload;

    if (!image_url) throw new Error("image_url is required");

    const ffmpegBin  = process.env.FFMPEG_PATH ?? "ffmpeg";
    const id         = randomUUID();
    const inputPath  = join(tmpdir(), `crop-in-${id}.jpg`);
    const outputPath = join(tmpdir(), `crop-out-${id}.jpg`);

    try {
      // 1. Download the source image
      logger.log("Downloading image for crop", { image_url });
      const response = await fetch(image_url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      await writeFile(inputPath, Buffer.from(await response.arrayBuffer()));

      // 2. Crop with FFmpeg
      // crop=w:h:x:y — all expressed as fractions of input dimensions so we
      // never need to know the actual pixel size upfront.
      // trunc() keeps values even-numbered (required by some encoders).
      const w = `trunc(iw*${width_percent  / 100})`;
      const h = `trunc(ih*${height_percent / 100})`;
      const x = `trunc(iw*${x_percent      / 100})`;
      const y = `trunc(ih*${y_percent      / 100})`;
      const cropFilter = `crop=${w}:${h}:${x}:${y}`;

      logger.log("Running FFmpeg crop", { cropFilter });
      await execFileAsync(ffmpegBin, [
        "-i",        inputPath,
        "-vf",       cropFilter,
        "-frames:v", "1",
        "-q:v",      "2",
        "-y",        outputPath,
      ]);

      // 3. Upload the cropped image to Transloadit for CDN-hosted URL
      const assembly = await transloadit.createAssembly({
        waitForCompletion: true,
        uploads: { file: await readFile(outputPath) },
        params: {
          steps: {
            ":original": { robot: "/upload/handle", result: true },
          },
        },
      });

      if (assembly.error) {
        throw new Error(`Transloadit upload error: ${assembly.error} — ${assembly.message}`);
      }

      const uploaded = assembly.results?.[":original"]?.[0];
      if (!uploaded?.ssl_url) throw new Error("Upload succeeded but no URL returned");

      logger.log("Image cropped successfully", { image_url: uploaded.ssl_url });
      return { image_url: uploaded.ssl_url };
    } finally {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    }
  },
});
