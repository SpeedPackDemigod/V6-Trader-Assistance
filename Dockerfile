# ---------------------------------------------------------------------------
# V6 Trader Assistance — production image
#
# The repo is a pnpm workspace; the deployable app is the static Vite SPA in
# artifacts/v6-trader-assistance. Production serve matches
# .replit-artifact/artifact.toml: static dist/public + "/*" -> "/index.html".
# ---------------------------------------------------------------------------

# --- Stage 1: build the SPA ------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10.33.3

# Build-time configuration (BASE_PATH must be "/" for the deployed preview).
ENV PORT=80 \
    BASE_PATH=/ \
    CI=true

# Optional: bake the Clerk publishable key into the bundle. It can also be
# supplied at runtime (server.mjs injects it into index.html on startup).
ARG VITE_CLERK_PUBLISHABLE_KEY=""
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

COPY . .

RUN pnpm install --frozen-lockfile --filter "@workspace/v6-trader-assistance..."
RUN pnpm --filter @workspace/v6-trader-assistance run build

# --- Stage 2: serve the static build ---------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=80 \
    HOST=0.0.0.0 \
    STATIC_DIR=/app/public

COPY --from=builder /app/artifacts/v6-trader-assistance/dist/public ./public
COPY server.mjs ./server.mjs

EXPOSE 80

CMD ["node", "server.mjs"]
