# Self-host image. Same artifact as `npx tailory`: the bundled tarball from
# `npm run pack:bundled`, so Docker and npx can't drift.
FROM node:24-slim
COPY .pack/tailory-spike-*-bundled.tgz /tmp/tailory.tgz
RUN npm install -g /tmp/tailory.tgz && rm /tmp/tailory.tgz && npm cache clean --force
ENV NODE_ENV=production \
    TAILORY_MODE=selfhost \
    HOST=0.0.0.0 \
    PORT=4413 \
    TAILORY_DATA_DIR=/data
VOLUME /data
EXPOSE 4413
USER node
HEALTHCHECK CMD node -e "fetch('http://127.0.0.1:4413/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["tailory"]
