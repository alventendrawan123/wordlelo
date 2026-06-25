# Wordlelo backend (@wordlelo/be) — Celo daily-word authority + SETTLER signer.
# Builds the pnpm workspace (be + its @wordlelo/core, @wordlelo/contracts deps)
# and runs the compiled Fastify server. Portable: works on Render / Koyeb / Fly / any
# Docker host. Binds 0.0.0.0:$PORT (PORT is injected by the host; defaults to 3001).
FROM node:22-slim

WORKDIR /app
RUN corepack enable

# Copy the whole workspace so pnpm can resolve the internal workspace:* deps.
# node_modules / dist / .env are excluded via .dockerignore (rebuilt here, secrets
# stay out of the image — they come from the host's env vars at runtime).
COPY . .

RUN pnpm install --frozen-lockfile \
 && pnpm --filter "@wordlelo/be..." build \
 && pnpm store prune

ENV NODE_ENV=production
WORKDIR /app/be

# Documentation only; the host maps its own $PORT. config.ts reads process.env.PORT.
EXPOSE 3001

CMD ["node", "dist/index.js"]
