FROM node:22-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_MOCK_MODE=false
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=80

WORKDIR /app
COPY --from=build /app/.output ./.output

EXPOSE 80
HEALTHCHECK --interval=20s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1/healthz || exit 1
CMD ["node", ".output/server/index.mjs"]
