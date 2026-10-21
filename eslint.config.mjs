import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Accesibilidad: reglas estrictas de jsx-a11y (el plugin ya lo registra eslint-config-next).
  {
    files: ["**/*.{jsx,tsx}"],
    rules: jsxA11y.flatConfigs.strict.rules,
  },
  {
    // Primitivas de shadcn/ui generadas por CLI: se revisan con axe en los tests.
    files: ["src/components/ui/**"],
    rules: { "jsx-a11y/no-noninteractive-element-interactions": "off" },
  },
  {
    files: ["src/lib/mock/**"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
  {
    // La UI nunca importa mocks: siempre pasa por src/lib/data.
    files: ["src/components/**", "src/app/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/lib/mock/*", "**/lib/mock/*"], message: "Usá src/lib/data en lugar de importar mocks." }] },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
