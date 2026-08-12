// Amplitude Analytics + Session Replay init, kept out of the page markup for
// the same reason as plausible-init.js: the site CSP (public/_headers) is
// `default-src 'none'` with no 'unsafe-inline', so the `window.amplitude.add(...)`
// / `window.amplitude.init(...)` calls Amplitude's own snippet normally inlines
// would be refused. Served from this origin it is covered by `script-src 'self'`
// — no inline exception, no hash to keep byte-in-sync.
//
// The loader (cdn.amplitude.com/script/<key>.js, loaded from Base.astro
// immediately before this file) defines `window.amplitude` and
// `window.sessionReplay` — this file only runs after that script has executed,
// since neither script tag carries `async`/`defer` and document order holds.
//
// Same Amplitude project as clawform-lp, deliberately: unlike Cloudflare Web
// Analytics and Plausible (which use a distinct token/site-id per site), this
// is one shared project across both Joseki sites. Split into two projects
// later by swapping this key if per-site separation turns out to matter.
window.amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
window.amplitude.init('d246bc9d34b889c1d6ba523262865a77', { fetchRemoteConfig: true, autocapture: true });
