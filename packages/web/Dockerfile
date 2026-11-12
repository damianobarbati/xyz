FROM node:26-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/web/package.json ./packages/web/package.json
COPY packages/types/package.json ./packages/types/package.json

RUN npm install --global "$(node --input-type=module -e "import pkg from './package.json' with { type: 'json' }; console.log(pkg.packageManager)")"

RUN --mount=type=cache,target=/root/.cache/pnpm pnpm -F web... install --frozen-lockfile

COPY packages/web ./packages/web
COPY packages/types ./packages/types

RUN pnpm -F web build
RUN pnpm -F web deploy --prod /out

FROM node:26-alpine AS runtime

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build --chown=node:node /out/package.json ./
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/web/dist ./dist
COPY --from=build --chown=node:node /app/packages/web/src/env.ts ./src/env.ts

EXPOSE 3000

USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "start"]
