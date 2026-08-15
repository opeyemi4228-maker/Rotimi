/**
 * Next's hook for errors that escape a request.
 *
 * A thrown error in a server component or a route handler renders the error
 * page and, without this, is otherwise unobserved. This is the one place the
 * framework offers to catch every one of them, so it is where reporting hangs.
 *
 * `register` is intentionally empty: there is nothing to instrument at boot.
 */
export function register() {}

export async function onRequestError(error, request, context) {
  const { report } = await import("./lib/report.js");
  report(error, {
    context: "request",
    path: request?.path,
    method: request?.method,
    /* Which rendering phase failed. A server-component error and a route-handler
       error look identical in a stack trace and need different fixes. */
    routerKind: context?.routerKind,
    routePath: context?.routePath,
    renderSource: context?.renderSource,
    /* Deliberately not the headers or the body: an error report is not a place
       to accumulate a copy of everybody's session cookie. */
  });
}
