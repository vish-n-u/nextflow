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

export const extractFrameTask = task({
  id: "extract-frame",
  retry: { maxAttempts: 3 },
  run: async (payload: { video_url: string; timestamp?: string }) => {
    const { video_url, timestamp = "0" } = payload;

    if (!video_url) throw new Error("video_url is required");

    const ffmpegBin  = process.env.FFMPEG_PATH  ?? "ffmpeg";
    const ffprobeBin = process.env.FFPROBE_PATH ?? "ffprobe";
    const id         = randomUUID();
    const inputPath  = join(tmpdir(), `frame-in-${id}.mp4`);
    const outputPath = join(tmpdir(), `frame-out-${id}.jpg`);

    try {
      // 1. Download the video
      logger.log("Downloading video for frame extraction", { video_url });
      const response = await fetch(video_url);
      if (!response.ok) throw new Error(`Failed to fetch video: ${response.status}`);
      await writeFile(inputPath, Buffer.from(await response.arrayBuffer()));

      // 2. Resolve seek position
      // timestamp is treated as a percentage (0–100) of total video duration.
      const pct = Math.min(100, Math.max(0, parseFloat(timestamp) || 0));

      // Use ffprobe to get the exact duration so we can convert % → seconds.
      const { stdout } = await execFileAsync(ffprobeBin, [
        "-v",            "quiet",
        "-print_format", "json",
        "-show_format",
        inputPath,
      ]);
      const probe = JSON.parse(stdout) as { format?: { duration?: string } };
      const duration = parseFloat(probe.format?.duration ?? "0");
      if (!duration) throw new Error("Could not determine video duration");

      const seekSeconds = (duration * pct) / 100;

      // 3. Extract the frame with FFmpeg
      // -ss before -i enables fast keyframe seek; -frames:v 1 grabs a single frame.
      logger.log("Running FFmpeg frame extraction", { pct, seekSeconds, duration });
      await execFileAsync(ffmpegBin, [
        "-ss",       String(seekSeconds),
        "-i",        inputPath,
        "-frames:v", "1",
        "-q:v",      "2",
        "-y",        outputPath,
      ]);

      // 4. Upload the extracted frame to Transloadit for CDN-hosted URL
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

      logger.log("Frame extracted successfully", { image_url: uploaded.ssl_url });
      return { image_url: uploaded.ssl_url };
    } finally {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    }
  },
});
