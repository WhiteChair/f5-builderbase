import type { MetadataRoute } from "next";

// Makes /app installable on a phone ("Add to Home Screen"): full screen, no browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KBC Mobile · concept (Kate Ahead)",
    short_name: "KBC concept",
    description: "Kate Ahead: a concept demo. Invented customers, no real data.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef3f6",
    theme_color: "#0091d2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
