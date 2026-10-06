// Web app manifest (spec 10, installable app).
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tippla",
    short_name: "Tippla",
    description: "What's coming, what needs a look, and how to get ahead, every pay cycle.",
    start_url: "/?src=install",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBFCFF",
    theme_color: "#244CCD",
    lang: "en-AU",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
