FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g bun
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
RUN mkdir -p /app/db
ENV PORT=3000
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/db/manahad.db
EXPOSE $PORT
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss && bun run scripts/seed.ts && bunx next start -p ${PORT:-3000} -H 0.0.0.0"]
