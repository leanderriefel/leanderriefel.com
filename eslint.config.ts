import type { Linter } from "eslint";

import js from "@eslint/js";
import globals from "globals";
import solidRecommended from "eslint-plugin-solid/configs/recommended";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const config: Linter.FlatConfig[] = [
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      ".next",
      ".nuxt",
      ".vinxi",
      "*.lock",
    ],
  },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,jsx,ts,tsx}"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "@typescript-eslint": tseslint as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(solidRecommended.plugins as any),
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...solidRecommended.rules,
    },
  },
];

export default config;
