FROM oven/bun:1.2-alpine AS builder

WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock .nvmrc .node-version* ./
COPY . .

RUN bun install --frozen-lockfile
RUN bun run build:node

FROM oven/bun:1.2-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun run healthcheck


CMD ["bun", "run", "start"]
