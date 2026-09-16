import localFont from "next/font/local";

// Shared across all 7 legacy tenants (byte-identical files in every repo,
// per the pre-migration audit) — lives once here now instead of duplicated.
export const sansation = localFont({
  variable: "--font-sansation",
  display: "swap",
  src: [
    { path: "../../public/fonts/sansation/Sansation-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/sansation/Sansation-Italic.ttf", weight: "400", style: "italic" },
    { path: "../../public/fonts/sansation/Sansation-Light.ttf", weight: "300", style: "normal" },
    { path: "../../public/fonts/sansation/Sansation-LightItalic.ttf", weight: "300", style: "italic" },
    { path: "../../public/fonts/sansation/Sansation-Bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/sansation/Sansation-BoldItalic.ttf", weight: "700", style: "italic" },
  ],
});
