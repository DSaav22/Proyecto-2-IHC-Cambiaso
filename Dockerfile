# Production image: API + built frontend on one origin (cookie auth).
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN pnpm install --frozen-lockfile

COPY apps/backend apps/backend
COPY apps/frontend apps/frontend

RUN pnpm --filter frontend build \
  && pnpm --filter backend exec prisma generate

ENV NODE_ENV=production
ENV FRONTEND_DIST=/app/apps/frontend/dist

WORKDIR /app/apps/backend

EXPOSE 10000

# Seed refuses NODE_ENV=production; run it once with development, then start.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && NODE_ENV=development pnpm exec prisma db seed && NODE_ENV=production pnpm start"]
