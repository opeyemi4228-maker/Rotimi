import coreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * eslint-config-next 16 ships a flat config, so it is imported directly.
 *
 * This file previously wrapped it in `FlatCompat`, which is the shim for
 * consuming *legacy* .eslintrc configs from a flat config file. Under ESLint 10
 * that shim tried to JSON.stringify the modern config in order to report a
 * schema error against it, hit the plugin object's circular reference, and
 * crashed — so `npm run lint` had not run at all. Importing the flat config as
 * a flat config removes the shim and the crash with it.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "lib/generated/**", // Prisma's output; not ours to lint
      "public/**",
      "scripts/.inec-source/**",
    ],
  },
  ...coreWebVitals,
];

export default eslintConfig;
