module.exports = {
  overrides: [
    // UI components - less strict rules since they're often auto-generated
    {
      files: ["src/components/ui/**/*.tsx"],
      rules: {
        "react-refresh/only-export-components": "warn",
        "@typescript-eslint/no-empty-object-type": "off",
      },
    },
    // Config files
    {
      files: ["*.config.ts", "*.config.js"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
      },
    },
    // Supabase generated files
    {
      files: ["src/integrations/**/*.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "warn",
      },
    },
  ],
};
