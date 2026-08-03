# MANAHAD — Main Next.js App
FROM node:20-slim

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files + Prisma schema
COPY package.json bun.lock ./
COPY prisma ./prisma

# Install Bun + dependencies
RUN npm install -g bun
RUN bun install --frozen-lockfile

# Copy all source
COPY . .

# Build the Next.js app (standard build, no standalone)
RUN bun run next build

# Create the db directory
RUN mkdir -p /app/db

# Railway needs the app to listen on 0.0.0.0
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/db/manahad.db
EXPOSE $PORT

# Create database tables, then start the server
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss && bunx next start -p ${PORT:-3000} -H 0.0.0.0"]
