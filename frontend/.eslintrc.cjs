module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint", "react-refresh"],
  rules: {
    "react-refresh/only-export-components": "warn",
  },
  ignorePatterns: [
    "dist",
    ".eslintrc.cjs",
    "node_modules",
    "vite.config.ts",
    "vitest.config.ts",
    "tailwind.config.ts",
    "postcss.config.js",
  ],
};
