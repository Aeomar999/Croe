import tseslint from "typescript-eslint";

/**
 * Croe backend ESLint flat config (eslint 10, typescript-eslint 8).
 * Non-type-aware recommended set only — type-checked rules live in the
 * typecheck gate (`tsc --noEmit`). Retrofit config: errors are bug-catching
 * rules; stylistic noise is downgraded to warnings so the gate stays green
 * while surfacing debt.
 */
export default tseslint.config(
  { ignores: ["dist/**", "coverage/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);