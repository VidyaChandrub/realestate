FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA
RUN printf '#!/bin/sh\necho "[Bootstrap] GIT_SHA=${GIT_SHA}"\n' \
    > /docker-entrypoint.d/10-log-git-sha.sh && \
    chmod +x /docker-entrypoint.d/10-log-git-sha.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
