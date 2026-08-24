// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy tokens — kept so any not-yet-touched component doesn't
        // break; the Advika Auto reskin uses the `advika` scale below.
        primary: "#3DF4A6",
        "primary-dark": "#1ec87e",

        // --- Advika Auto design tokens (see design_handoff_advika_auto/README.md) ---
        advika: {
          orange: "#f97316",
          "orange-hover": "#fb923c",
          "orange-dark": "#ea580c",
          "orange-darker": "#c2570b",
          "orange-darker2": "#9a3412",
          "orange-tint": "#fff7ed",
          "orange-tint2": "#fef7ed",
          "orange-tint3": "#fef1e6",
          "orange-border": "#fed7aa",
          ink: "#0a0a0a",
          "near-black": "#0d0d0d",
          chrome: "#171717",
          panel: "#1f1f1f",
          "border-dark": "#262626",
          "border-dark2": "#2e2e2e",
          "border-dark3": "#333333",
          "border-dark4": "#404040",
          "warm-white": "#f5f4f2",
          "off-white": "#fafaf9",
          "off-white2": "#fafaf8",
          "border-light": "#e5e5e5",
          "divider-light": "#f0efed",
          grey400: "#d4d4d4",
          grey500: "#c4c0bb",
          grey550: "#8b8681",
          grey600: "#a3a3a3",
          grey650: "#5f5f5f",
          grey700: "#737373",
          grey800: "#525252",
          grey900: "#404040",
          success: "#16a34a",
          "success-dark": "#15803d",
          "success-tint": "#f0fdf4",
          "success-tint2": "#dcfce7",
          "success-border": "#bbf7d0",
          "success-bright": "#22c55e",
          whatsapp: "#128c7e",
          "whatsapp-bright": "#25d366",
          "whatsapp-tint": "#d1fae5",
          info: "#1d4ed8",
          "info-tint": "#eff6ff",
          "info-border": "#bfdbfe",
          warning: "#d97706",
          danger: "#dc2626",
          "danger-bright": "#ef4444",
          amber: "#fbbf24",
          "amber-tint": "#fef3c7",
        },
      },
      fontFamily: {
        greatvibes: ["'Great Vibes'", "cursive"],
        display: ["'Playfair Display'", "Georgia", "serif"],
        body: ["'DM Sans'", "system-ui", "sans-serif"],
        gotham: ["'DM Sans'", "system-ui", "sans-serif"],
        // Advika Auto system
        archivoBlack: ["'Archivo Black'", "'Noto Sans Devanagari'", "sans-serif"],
        archivo: ["'Archivo'", "'Noto Sans Devanagari'", "system-ui", "sans-serif"],
        plexmono: ["'IBM Plex Mono'", "'Noto Sans Devanagari'", "monospace"],
        devanagari: ["'Noto Sans Devanagari'", "'Archivo'", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.07)",
        "card-hover": "0 8px 28px rgba(0,0,0,0.13)",
        "advika-modal": "0 30px 70px rgba(0,0,0,.7)",
      },
      keyframes: {
        "advika-ticker": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "advika-ticker": "advika-ticker 22s linear infinite",
      },
      maxWidth: {
        shell: "520px",
      },
    },
  },
  plugins: [],
};
