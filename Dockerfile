FROM oven/bun:1 AS base

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production --ignore-scripts

# Copy source code
COPY src/ src/
COPY tsconfig.json ./

EXPOSE 3000

ENV PORT=3000

CMD ["bun", "run", "src/index.tsx", "--serve"]
