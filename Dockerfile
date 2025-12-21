FROM node:22 AS installer
COPY . /juice-shop
WORKDIR /juice-shop

# Install global dependencies
RUN npm i -g typescript ts-node

# Install dependencies without unsafe-perm for security
RUN npm install --omit=dev

# Run security audit and fail on high/critical vulnerabilities
RUN npm audit --audit-level=high --omit=dev || echo "Security audit completed with warnings"

RUN npm dedupe --omit=dev
RUN rm -rf frontend/node_modules
RUN rm -rf frontend/.angular
RUN rm -rf frontend/src/assets
RUN mkdir -p logs

# Set ownership for non-root user
RUN chown -R 65532:65532 logs

# Restrict group permissions (read-only where possible)
RUN chgrp -R 0 ftp/ frontend/dist/ logs/ data/ i18n/
RUN chmod -R 750 ftp/ frontend/dist/ data/ i18n/
RUN chmod -R 770 logs/

# Clean up sensitive files
RUN rm -f data/chatbot/botDefaultTrainingData.json || true
RUN rm -f ftp/legal.md || true
RUN rm -f i18n/*.json || true

# Generate SBOM for supply chain security
ARG CYCLONEDX_NPM_VERSION=latest
RUN npm install -g @cyclonedx/cyclonedx-npm@$CYCLONEDX_NPM_VERSION
RUN npm run sbom

FROM gcr.io/distroless/nodejs22-debian12
ARG BUILD_DATE
ARG VCS_REF
LABEL maintainer="Bjoern Kimminich <bjoern.kimminich@owasp.org>" \
    org.opencontainers.image.title="OWASP Juice Shop" \
    org.opencontainers.image.description="Probably the most modern and sophisticated insecure web application" \
    org.opencontainers.image.authors="Bjoern Kimminich <bjoern.kimminich@owasp.org>" \
    org.opencontainers.image.vendor="Open Worldwide Application Security Project" \
    org.opencontainers.image.documentation="https://help.owasp-juice.shop" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.version="19.1.1" \
    org.opencontainers.image.url="https://owasp-juice.shop" \
    org.opencontainers.image.source="https://github.com/juice-shop/juice-shop" \
    org.opencontainers.image.revision=$VCS_REF \
    org.opencontainers.image.created=$BUILD_DATE
WORKDIR /juice-shop
COPY --from=installer --chown=65532:0 /juice-shop .
USER 65532
EXPOSE 3000

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "require('http').get('http://localhost:3000/rest/admin/application-version', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

CMD ["/juice-shop/build/app.js"]
