import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", ".agents/", ".claude/"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // A non-null assertion hides exactly the failures this package promises
      // never to throw.
      "@typescript-eslint/no-non-null-assertion": "error",
      // A leading underscore marks a value dropped on purpose, usually by
      // destructuring it out of an object.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
