FROM node:25.6-alpine AS base

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

ARG APP_BUILD
ENV APP_BUILD=$APP_BUILD

WORKDIR /mnt
COPY ./package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY services/api ./services/api
# COPY services/types ./services/types
# COPY services/common ./services/common
# COPY services/blockchain ./services/blockchain

RUN apk add --no-cache --update --upgrade --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community pnpm dumb-init
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline --prod

RUN chown -R node:node /usr/bin/pnpm
RUN chown -R node:node ./services/api/src/docs
RUN chown -R node:node ./services/api/src/hotfix.ts # special file "node" user can edit and run on emergency

USER node
CMD dumb-init pnpm -F api start
