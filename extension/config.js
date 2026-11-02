/**
 * TryIt AI — Configuration (`extension/config.js`)
 * Production Cloud Run: https://tryit-ai-165171821863.us-central1.run.app
 * Custom Domain: https://tryit.sineix.com
 * Local Dev: http://localhost:8000
 */
const TRYIT_CONFIG = {
  DEFAULT_BACKEND_URL: "https://tryit-ai-165171821863.us-central1.run.app",
  CUSTOM_DOMAIN_URL: "https://tryit.sineix.com",
  LOCAL_FALLBACK_URL: "http://localhost:8000",
  GITHUB_REPO_URL: "https://github.com/faisal-ismail/tryit",
  HACKATHON_URL: "https://youcam-api-skin-ai-ecommerce.devpost.com/",
  POLL_INTERVAL_MS: 1000,
  MAX_POLL_ATTEMPTS: 22,
  THEME: {
    bgPrimary: "#FFFFFF",
    bgSecondary: "#F5F5F5",
    textPrimary: "#111111",
    textMuted: "#6B6B6B",
    accentGold: "#BB9935",
    accentGoldLight: "#D4AF37",
    hoverBlack: "#000000",
    borderLine: "#D7D7D7",
    successGreen: "#008669",
    saleRed: "#971400",
  },
};

if (typeof globalThis !== "undefined") {
  globalThis.TRYIT_CONFIG = TRYIT_CONFIG;
}
