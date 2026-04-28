import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep auth pages, API routes, and the app itself out of search indexes
        disallow: ["/api/", "/dashboard/", "/sign-in/", "/sign-up/"],
      },
    ],
  };
}
