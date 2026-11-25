# Self-host image. It installs the same tarball as `npx tailory`, so the two can't drift.
# Build the tarball first with `npm run pack:tarball --workspace tailory` (see README.md).
FROM docker.io/library/node:24.20.0-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e

COPY .pack/tailory-*.tgz /tmp/
RUN npm install --global --no-audit --no-fund /tmp/tailory-*.tgz \
  && rm /tmp/tailory-*.tgz \
  && npm cache clean --force \
  && mkdir /data \
  && chown node:node /data

ENV NODE_ENV=production \
  TAILORY_MODE=server \
  TAILORY_HOST=0.0.0.0 \
  PORT=4413 \
  TAILORY_DATA_DIR=/data

# Holds the database when DATABASE_URL is unset.
VOLUME /data
EXPOSE 4413
USER node
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/healthz`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["tailory"]
