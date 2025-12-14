import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import eslintPluginTs from "@typescript-eslint/eslint-plugin";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y";
import astroParser from "astro-eslint-parser";
import eslintPluginAstro from "eslint-plugin-astro";

export default [
  // Globalne ignorowanie plików/katalogów
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".astro/**",
      "playwright-report/**",
      "test-results/**",
      "supabase/migrations/**",
    ],
  },

  // Podstawowa konfiguracja JS (eslint:recommended)
  {
    ...js.configs.recommended,
    files: ["src/**/*.{ts,tsx,astro}"],
  },

  // TypeScript + React
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        React: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Response: "readonly",
        URL: "readonly",
        console: "readonly",
        HTMLInputElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLElement: "readonly",
        HTMLButtonElement: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": eslintPluginTs,
      react: eslintPluginReact,
      "react-hooks": eslintPluginReactHooks,
      "jsx-a11y": eslintPluginJsxA11y,
    },
    rules: {
      // Korzystamy z wersji TypeScriptowych, wyłączamy bazowe
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // Astro
  {
    files: ["src/**/*.astro"],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: [".astro"],
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
    plugins: {
      astro: eslintPluginAstro,
    },
    rules: {},
  },
];


