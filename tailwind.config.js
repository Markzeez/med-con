// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",      // App Router
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",    // Pages Router
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",      // if using /src
  ],
  theme: { extend: {} },
  plugins: [],
}