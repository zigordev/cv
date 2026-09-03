FROM node:24-alpine AS base
WORKDIR /workspace

FROM base AS deps-build
COPY package.json package-lock.json ./
COPY apps/ui/package.json apps/ui/package.json
COPY scripts/prepare-husky.mjs scripts/prepare-husky.mjs
RUN set -eux; \
  for attempt in 1 2 3; do \
    HUSKY=0 npm ci --workspace @cv/web --include-workspace-root --ignore-scripts && break; \
    if [ "$attempt" -eq 3 ]; then \
      exit 1; \
    fi; \
    echo "npm ci failed (attempt $attempt), retrying in 10s..."; \
    sleep 10; \
  done

FROM base AS deps-prod
COPY package.json package-lock.json ./
COPY apps/ui/package.json apps/ui/package.json
COPY scripts/prepare-husky.mjs scripts/prepare-husky.mjs
RUN set -eux; \
  for attempt in 1 2 3; do \
    HUSKY=0 npm ci --workspace @cv/web --include-workspace-root --omit=dev --ignore-scripts && break; \
    if [ "$attempt" -eq 3 ]; then \
      exit 1; \
    fi; \
    echo "npm ci failed (attempt $attempt), retrying in 10s..."; \
    sleep 10; \
  done

FROM base AS build
ENV NODE_ENV=production
ARG NEXT_PUBLIC_RELEASE
ENV NEXT_PUBLIC_RELEASE=${NEXT_PUBLIC_RELEASE}
# Chromium renders the print document to public/cv-*.pdf during the build. It
# is a build-stage dependency only and never reaches the runtime image below.
# ttf-liberation is metric-compatible with the Arial the print sheet asks for.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-liberation
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# Fail the image build if the PDF cannot be produced, so a released container
# can never ship a download button pointing at a missing file.
ENV CV_PDF_REQUIRED=1
COPY --from=deps-build /workspace/node_modules /workspace/node_modules
COPY package.json /workspace/package.json
COPY apps/ui /workspace/apps/ui
WORKDIR /workspace/apps/ui
RUN mkdir -p public && npm run build

FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
RUN apk upgrade --no-cache zlib libcrypto3 libssl3 \
 && rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v1.22.22 \
 && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=deps-prod /workspace/node_modules /app/node_modules
COPY --from=build /workspace/apps/ui/.next/standalone ./
COPY --from=build /workspace/apps/ui/.next/static ./apps/ui/.next/static
COPY --from=build /workspace/apps/ui/public ./apps/ui/public
COPY --from=build /workspace/apps/ui/messages ./apps/ui/messages
COPY scripts/openbao-run.mjs /app/scripts/openbao-run.mjs
# next/image writes optimised variants into .next/cache at runtime. Everything
# above is copied as root, so the unprivileged user the container drops to
# cannot create it — which surfaces as an EACCES unhandledRejection on the
# first image request rather than anything that mentions permissions.
RUN mkdir -p /app/apps/ui/.next/cache \
 && chown -R node:node /app/apps/ui/.next
USER node
EXPOSE 3001
CMD ["node", "apps/ui/server.js"]

FROM prod AS local
