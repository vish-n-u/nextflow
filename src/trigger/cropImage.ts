import { logger, task } from "@trigger.dev/sdk";
import { Transloadit } from "transloadit";

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

    logger.log("Cropping image via Transloadit", {
      image_url, x_percent, y_percent, width_percent, height_percent,
    });

    // Transloadit /image/resize crop takes x1/y1 (top-left) and x2/y2 (bottom-right)
    // expressed as percentage strings e.g. "10%"
    const x1 = `${x_percent}%`;
    const y1 = `${y_percent}%`;
    const x2 = `${Math.min(x_percent + width_percent, 100)}%`;
    const y2 = `${Math.min(y_percent + height_percent, 100)}%`;

    const assembly = await transloadit.createAssembly({
      waitForCompletion: true,
      params: {
        steps: {
          imported: {
            robot: "/http/import",
            url:   image_url,
          },
          cropped: {
            robot:  "/image/resize",
            use:    "imported",
            crop:   { x1, y1, x2, y2 },
            result: true,
          },
        },
      },
    });

    if (assembly.error) {
      throw new Error(`Transloadit error: ${assembly.error} — ${assembly.message}`);
    }

    const uploaded = assembly.results?.cropped?.[0];
    if (!uploaded?.ssl_url) {
      throw new Error("Crop succeeded but no URL returned from Transloadit");
    }

    const image_url_out = uploaded.ssl_url;
    logger.log("Image cropped successfully", { image_url: image_url_out });
    return { image_url: image_url_out };
  },
});
