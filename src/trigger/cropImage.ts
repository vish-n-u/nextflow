import { logger, task } from "@trigger.dev/sdk";

export const cropImageTask = task({
  id: "crop-image",
  run: async (payload: {
    image_url: string;
    x_percent?: number;
    y_percent?: number;
    width_percent?: number;
    height_percent?: number;
  }) => {
    const {
      image_url,
      x_percent = 0,
      y_percent = 0,
      width_percent = 100,
      height_percent = 100,
    } = payload;

    logger.log("Cropping image", { image_url, x_percent, y_percent, width_percent, height_percent });

    // TODO: integrate with image processing service (e.g. Transloadit, Sharp)

    const cropped_image_url = image_url; // placeholder

    logger.log("Image cropped successfully", { cropped_image_url });

    return { image_url: cropped_image_url };
  },
});
