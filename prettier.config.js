/** @type {import('prettier').Config} */
const config = {
  semi: false,
  singleQuote: false,
  trailingComma: "all",
  tabWidth: 2,
  printWidth: 120,
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/app.css",
}

export default config
