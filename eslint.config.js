const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      "**/*.min.js"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["backend/**/*.ts"],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ["frontend/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  },
  {
    files: ["*.js"],
    languageOptions: {
      globals: globals.node
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
);
