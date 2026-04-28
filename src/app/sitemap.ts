import type { MetadataRoute } from "next";

// Set via NEXT_PUBLIC_APP_URL in your environment variables
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nextflow.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url:             `${BASE_URL}/`,
      lastModified:    new Date(),
      changeFrequency: "monthly",
      priority:        1,
    },
  ];
}
