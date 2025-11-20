FROM node:20-slim AS deps
WORKDIR /app

# Install dependencies and generate Prisma client
COPY package.json tsconfig.json ./
COPY prisma ./prisma
RUN npm install
RUN npx prisma generate

FROM deps AS builder
COPY src ./src
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Copy app artifacts and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000
CMD ["./docker-entrypoint.sh"]
