// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3DF4A6",
        "primary-dark": "#1ec87e",
      },
      fontFamily: {
        greatvibes: ["'Great Vibes'", "cursive"],
        display: ["'Playfair Display'", "Georgia", "serif"],
        body: ["'DM Sans'", "system-ui", "sans-serif"],
        gotham: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.07)",
        "card-hover": "0 8px 28px rgba(0,0,0,0.13)",
      },
    },
  },
  plugins: [],
};
