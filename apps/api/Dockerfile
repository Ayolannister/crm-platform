   # syntax=docker/dockerfile:1

   FROM node:24-alpine AS deps
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN --mount=type=cache,target=/root/.npm npm ci

   FROM deps AS build
   COPY . .
   RUN npm run build

   FROM node:24-alpine AS prod-deps
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

   FROM node:24-alpine AS runtime
   LABEL org.opencontainers.image.source="https://github.com/Ayolannister/crm-platform"
   ENV NODE_ENV=production
   RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
       /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
       /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg
   WORKDIR /app
   COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
   COPY --from=build --chown=node:node /app/dist ./dist
   COPY --from=build --chown=node:node /app/drizzle ./drizzle
   COPY --chown=node:node package.json ./
   USER node
   EXPOSE 3000
   CMD ["node", "dist/main.js"]