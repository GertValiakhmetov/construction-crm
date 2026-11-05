FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@9.10.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm --filter @crm/web... --filter @crm/api... install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/contracts/tsconfig.json packages/contracts/
COPY packages/contracts/src packages/contracts/src
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src apps/api/src
COPY apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html apps/web/
COPY apps/web/src apps/web/src
RUN pnpm -r build && pnpm --filter @crm/api deploy --prod /runtime

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
COPY --from=build /runtime ./
COPY --from=build /workspace/apps/web/dist ./public
USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
