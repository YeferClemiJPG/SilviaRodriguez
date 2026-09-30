export default [
  {
    ignores: ["node_modules/**", "dist/**", "dist-preview/**", "artifacts/**"],
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: {
      "no-unused-vars": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-constant-condition": "error",
      eqeqeq: "error",
    },
  },
];
