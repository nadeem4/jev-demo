# Arena UI: the Next.js app built to static files, served by nginx.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The browser (not this container) calls the API, so this is the API's address as seen from the host.
ARG NEXT_PUBLIC_ARENA_API=http://localhost:8000
ENV NEXT_PUBLIC_ARENA_API=$NEXT_PUBLIC_ARENA_API NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM nginx:1.29-alpine
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 80
