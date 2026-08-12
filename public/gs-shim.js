// ══════════════════════════════════════════════════════════════
//  google.script.run compatibility shim
//
//  The original app (index.html) was written for Google Apps Script and
//  calls things like:
//    google.script.run.withSuccessHandler(cb).withFailureHandler(err).getFlats()
//    google.script.run.withSuccessHandler(cb).addTenant(myPin, data)
//
//  This shim reproduces that exact chainable API in a normal browser, so
//  the original app's JS does not need to change AT ALL. Every call is
//  forwarded to POST /api/rpc as { fn: "<functionName>", args: [...] },
//  which dispatches to the matching server-side handler (see
//  lib/rpc-handlers.js) and returns the same shape Code.gs used to return.
// ══════════════════════════════════════════════════════════════
(function () {
  function callRpc(fnName, args, successHandler, failureHandler) {
    fetch('/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fn: fnName, args }),
    })
      .then((res) => {
        // Session expired/logged out elsewhere, or subscription lapsed —
        // send the browser straight to the right page instead of leaving
        // the user stuck on a stalled loading screen with a buried error.
        if (res.status === 401) { window.location.href = '/login'; return Promise.reject(new Error('__redirecting__')); }
        if (res.status === 402) { window.location.href = '/billing'; return Promise.reject(new Error('__redirecting__')); }
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error((data && data.error) || 'Server error');
          });
        }
        return res.json();
      })
      .then((data) => {
        if (successHandler) successHandler(data);
      })
      .catch((err) => {
        if (err && err.message === '__redirecting__') return; // navigation already triggered above
        if (failureHandler) failureHandler(err.message || String(err));
        else if (typeof console !== 'undefined') console.error('RPC error:', err);
      });
  }

  // Returns the object you get after zero-or-more of withSuccessHandler /
  // withFailureHandler have been chained — it still lets you chain the
  // other one, OR go straight to calling the actual RPC function name.
  function chainable(successHandler, failureHandler) {
    return new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'withSuccessHandler') {
            return function (cb) {
              return chainable(cb, failureHandler);
            };
          }
          if (prop === 'withFailureHandler') {
            return function (cb) {
              return chainable(successHandler, cb);
            };
          }
          // Anything else is the actual RPC function name — call it directly.
          return function (...args) {
            callRpc(prop, args, successHandler, failureHandler);
          };
        },
      }
    );
  }

  window.google = {
    script: {
      run: chainable(null, null),
      host: {
        close: function () {
          window.location.href = '/dashboard';
        },
      },
    },
  };
})();
