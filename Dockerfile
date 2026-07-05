FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /usr/src/app

# Copy lockfile and workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json tsconfig.base.json ./

# Copy all packages and libraries
COPY lib ./lib
COPY artifacts ./artifacts

# Install dependencies and build the workspace
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

# Expose port and start the API server
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
