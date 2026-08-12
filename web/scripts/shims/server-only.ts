// CLI scripts run under plain Node via tsx, never bundled into a browser build,
// so the "server-only" import-guard's protection is meaningless here — the real
// package throws unconditionally outside Next's bundler (see scripts/tsconfig.json,
// which redirects "server-only" to this no-op only for files under scripts/).
export {};
