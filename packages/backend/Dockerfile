FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb* ./
COPY packages/backend/package.json packages/backend/
RUN cd packages/backend && bun install --frozen-lockfile

# Runtime image
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY packages/backend/ ./packages/backend/

WORKDIR /app/packages/backend
ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
