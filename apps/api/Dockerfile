   FROM node:24-alpine AS deps
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci

   FROM deps AS build
   COPY . .
   RUN npm run build

   FROM node:24-alpine AS prod-deps
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci --omit=dev

   FROM node:24-alpine AS runtime
   ENV NODE_ENV=production
   WORKDIR /app
   COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
   COPY --from=build --chown=node:node /app/dist ./dist
   COPY --from=build --chown=node:node /app/drizzle ./drizzle
   COPY --chown=node:node package.json ./
   USER node
   EXPOSE 3000
   CMD ["node", "dist/main.js"]