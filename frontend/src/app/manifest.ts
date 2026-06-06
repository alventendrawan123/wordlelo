import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wordlelo",
    short_name: "Wordlelo",
    description: "A daily 5-letter word game, settled on Celo.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6aaa64",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
