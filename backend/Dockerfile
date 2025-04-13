FROM node:23-bullseye
WORKDIR /app

# Install OS deps Prisma needs (OpenSSL + build tools)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      openssl \
      python3 \
      make \
      g++ \
 && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Copy package manifests & install
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy Prisma schema & generate client using the *local* CLI
COPY prisma ./prisma/
RUN pnpm prisma generate

# Copy the rest of your source
COPY . .

# Expose & launch
EXPOSE 5000
CMD ["pnpm", "run", "dev"]
