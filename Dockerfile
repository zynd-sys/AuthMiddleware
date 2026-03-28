FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM deps AS build
COPY tsconfig.json rolldown.config.ts ./
COPY Source ./Source
RUN npm run build

FROM base AS production-deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

COPY --from=production-deps /app/package.json ./package.json
COPY --from=build /app/Dist ./Dist

CMD ["node", "./Dist/index.mjs"]
