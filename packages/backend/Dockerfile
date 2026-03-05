FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
WORKDIR /app/packages/backend
COPY packages/backend/package.json ./
COPY packages/backend/bun.lock ./
RUN bun install --frozen-lockfile --production

# Runtime image
FROM base AS runner
WORKDIR /app/packages/backend
COPY --from=deps /app/packages/backend/node_modules ./node_modules
COPY packages/backend/ ./
ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
