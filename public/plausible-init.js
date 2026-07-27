// Plausible Analytics init, kept out of the page markup on purpose.
//
// The site CSP (public/_headers) is `default-src 'none'` with no
// 'unsafe-inline', so the queue-stub + init() that Plausible's snippet normally
// inlines would be refused. Served from this origin it is covered by
// `script-src 'self'` — no inline exception, no hash to keep byte-in-sync.
//
// The tracker (plausible.io/js/pa-*.js, loaded from Base.astro) drains this
// queue once it arrives.
window.plausible = window.plausible || function () { (plausible.q = plausible.q || []).push(arguments) };
plausible.init = plausible.init || function (i) { plausible.o = i || {} };
plausible.init();
