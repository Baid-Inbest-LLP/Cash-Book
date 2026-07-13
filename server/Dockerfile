FROM node:20-alpine

WORKDIR /app

# Chromium + fonts/libs for Puppeteer PDF export. Alpine is musl-based, so Puppeteer's bundled
# (glibc) Chromium download won't run here — use the system chromium package instead and skip
# the bundled download entirely.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Pinned (not @latest): newer pnpm releases require Node >= 22.13 (they use the node:sqlite
# built-in), which doesn't exist on this image's Node 20 — @latest silently drifts and breaks
# the build once pnpm crosses that line. Pin to the version used in local dev instead.
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

COPY . .

RUN mkdir -p uploads

EXPOSE 5001

CMD ["node", "src/index.js"]
