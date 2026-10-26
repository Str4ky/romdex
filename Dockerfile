FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig*.json ./
COPY src ./src
COPY public ./public
COPY server ./server
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/assets.ts server/app.ts server/index.ts ./server/
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production \
	games_path=/games \
	PORT=8080
EXPOSE 8080
CMD ["node", "server/index.ts"]
