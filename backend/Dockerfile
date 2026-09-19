# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

FROM dependencies AS development

ENV NODE_ENV=development

COPY backend backend

WORKDIR /app/backend

CMD ["npm", "run", "start:dev"]

FROM dependencies AS db-init

COPY backend backend

WORKDIR /app/backend

RUN DATABASE_URL=postgresql://taler_build:taler_build@localhost:5432/taler_build \
    npm run prisma:generate

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run prisma:seed"]

FROM dependencies AS build

COPY backend backend

RUN DATABASE_URL=postgresql://taler_build:taler_build@localhost:5432/taler_build \
    npm run prisma:generate --workspace=backend
RUN npm run build --workspace=backend

FROM node:24-alpine AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci --omit=dev --workspace=backend --include-workspace-root

FROM node:24-alpine AS production

ENV NODE_ENV=production
WORKDIR /app/backend

RUN addgroup -S -g 1001 taler \
    && adduser -S -D -H -u 1001 -G taler taler

COPY --from=production-dependencies --chown=taler:taler /app/node_modules /app/node_modules
COPY --from=build --chown=taler:taler /app/backend/dist ./dist
COPY --chown=taler:taler backend/package.json ./package.json

EXPOSE 3000

USER taler

CMD ["node", "dist/main.js"]
