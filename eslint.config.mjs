export default [
  {
    ignores: [
      "**/*.ts",
      "**/*.tsx",
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {},
  },
]
