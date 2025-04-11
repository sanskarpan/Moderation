FROM node:16-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Generate Prisma client
RUN pnpm dlx prisma generate

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 5000

# Start the app
CMD ["pnpm", "run", "dev"]