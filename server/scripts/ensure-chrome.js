import { execSync } from 'node:child_process';

// Docker builds provide a system Chromium and set these explicitly (see ../Dockerfile),
// so Puppeteer's own download is unnecessary there — nothing to do.
if (process.env.PUPPETEER_SKIP_DOWNLOAD === 'true' || process.env.PUPPETEER_EXECUTABLE_PATH) {
  process.exit(0);
}

// Outside Docker (e.g. a native/buildpack host), Puppeteer needs its own Chrome build.
// pnpm does not run a dependency's postinstall script by default, so Puppeteer's built-in
// download step is silently skipped during `pnpm install` — run it explicitly here instead,
// as this package's own postinstall (which pnpm always runs).
execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
