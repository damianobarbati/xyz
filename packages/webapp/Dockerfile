FROM node:26.7-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install -g corepack && corepack enable
WORKDIR /mnt

FROM base AS builder
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --silent --frozen-lockfile --prefer-offline
RUN pnpm -F webapp build

FROM node:26.7-alpine AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init

WORKDIR /mnt
COPY --from=builder /mnt/packages/webapp/package.json ./package.json
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /mnt/packages/webapp/serve.json ./serve.json
COPY --from=builder /mnt/packages/webapp/dist ./dist
RUN npm install -g serve

USER node
EXPOSE 80

CMD ["/usr/bin/dumb-init", "--", "npm", "run", "serve"]
