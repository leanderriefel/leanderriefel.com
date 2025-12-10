import type { ESLint, Linter } from "eslint";

import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import solid from "eslint-plugin-solid";
import globals from "globals";

const config: Linter.FlatConfig[] = [
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      ".next",
      ".nuxt",
      ".vinxi",
      ".vercel",
      ".output",
      "*.lock",
    ],
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
      "@typescript-eslint": tseslint as unknown as ESLint.Plugin,
      solid: solid as unknown as ESLint.Plugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...solid.configs["flat/recommended"].rules,
    },
  },
];

export default config;
