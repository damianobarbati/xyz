FROM node:26.7-alpine AS base

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

ARG APP_BUILD
ENV APP_BUILD=$APP_BUILD

RUN npm install -g corepack && corepack enable
WORKDIR /mnt

FROM base AS builder
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --silent --frozen-lockfile --prefer-offline
RUN pnpm -F api --prod deploy /out

FROM node:26.7-alpine AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init

WORKDIR /mnt
COPY --from=builder /out ./
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml
# RUN chown -R node:node ./packages/api/src/hotfix.ts

USER node
EXPOSE 8080

CMD ["/usr/bin/dumb-init", "--", "npm", "run", "start"]
