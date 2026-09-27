// Wrap every API route's handler with this. Without it, an unexpected
// exception (DB connection failure, bad env var, a bug, anything) crashes
// the route and Next.js responds with its default HTML error page instead
// of JSON — which is exactly what causes the frontend's `res.json()` call
// to fail with "Unexpected token '<', <!DOCTYPE... is not valid JSON",
// a very confusing error that hides the real problem.
//
// With this wrapper, any such crash is caught and turned into a normal
// { error: "..." } JSON response with status 500, and the real error is
// still logged server-side (visible in `next dev`'s terminal, or in
// Vercel → your project → Deployments → Functions → Logs) so it's easy
// to diagnose.
export function withJsonErrors(handler) {
  return async function wrapped(req, res) {
    try {
      return await handler(req, res);
    } catch (e) {
      console.error(`API error on ${req.method} ${req.url}:`, e);
      if (!res.headersSent) {
        res.status(500).json({ error: e?.message || 'সার্ভার এরর হয়েছে, একটু পরে আবার চেষ্টা করুন।' });
      }
    }
  };
}
