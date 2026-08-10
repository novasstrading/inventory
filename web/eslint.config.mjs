import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This codebase's dashboard views deliberately fetch-on-mount via a plain
      // useEffect (apiFetch + useState) rather than a data-fetching library —
      // a conscious speed trade-off for M2-M4, not an oversight. That is exactly
      // the pattern this rule flags project-wide, so it'd otherwise need ~10
      // scattered inline disables for one intentional, documented choice.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
