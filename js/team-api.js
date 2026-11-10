/* Sidesuites team backend client: the Google Apps Script web app in tools/team-backend/.
   After deploying it, paste its "Web app URL" (ends in /exec) below. Until then, logging is skipped silently
   (the Web3Forms emails still arrive as before), and the booking and team-login pages say they are not connected. */
(function () {
  var URL = ''; // e.g. 'https://script.google.com/macros/s/AKfycb.../exec'
  function post(action, body, opts) {
    if (!URL) return Promise.reject(new Error('not-configured'));
    body = body || {}; body.action = action;
    // text/plain keeps this a "simple" request (no CORS preflight, which Apps Script cannot answer)
    return fetch(URL, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', keepalive: !!(opts && opts.keepalive) })
      .then(function (r) { return r.json(); });
  }
  window.SSTeam = {
    configured: function () { return !!URL; },
    post: post,
    // fire-and-forget: never blocks or breaks the page
    log: function (action, data) { if (!URL) return; try { post(action, { data: data }, { keepalive: true }).catch(function () {}); } catch (e) {} }
  };
})();
