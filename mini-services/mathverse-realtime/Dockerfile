FROM oven/bun:1
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY index.ts ./
ENV PORT=3003
EXPOSE $PORT
CMD ["bun", "run", "index.ts"]
