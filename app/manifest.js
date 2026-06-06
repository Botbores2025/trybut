export default function manifest() {
  return {
    name: "trybut",
    short_name: "trybut",
    description: "sua tribo, do seu jeito",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f3",
    theme_color: "#f4621f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
