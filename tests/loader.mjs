/**
 * Let Node resolve the imports Next resolves.
 *
 * The app is written for the Next bundler, which resolves `./db` to `./db.js`
 * and `@/lib/x` to `<root>/lib/x` without being told. Node's ESM loader does
 * neither, so a plain `node --test` cannot import a single file in lib/.
 *
 * The alternative was rewriting every import in the app to satisfy the test
 * runner, which is the tail wagging the dog — and would be a large diff across
 * files whose behaviour nobody is changing. This hook is twenty lines and it
 * only ever loads inside `npm test`.
 */
import { pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

export async function resolve(specifier, context, next) {
  /* The `@/` alias from jsconfig.json. */
  if (specifier.startsWith("@/")) {
    return next(pathToFileURL(path.join(ROOT, specifier.slice(2))).href, context);
  }

  try {
    return await next(specifier, context);
  } catch (error) {
    /* Extensionless relative import: try the two things the bundler would. */
    if (error?.code === "ERR_MODULE_NOT_FOUND" && /^[./]/.test(specifier)) {
      for (const suffix of [".js", "/index.js", ".mjs"]) {
        try {
          return await next(specifier + suffix, context);
        } catch {
          /* try the next shape */
        }
      }
    }
    throw error;
  }
}
