# Образ приложения: Ktor отдаёт API под /api и собранный frontend (SPA-fallback на index.html).
# Сборка: docker build -t calendar . ; запуск вместе с PostgreSQL — docker compose up --build.

# ---------- frontend ----------
FROM node:26-slim AS frontend
WORKDIR /src
# Сначала только манифесты: слой с npm ci кэшируется, пока не меняются зависимости.
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
RUN npm ci --workspace frontend --include-workspace-root
# SDK (src/api/schema.d.ts) закоммичен — генерировать контракт не нужно.
COPY frontend/ frontend/
RUN npm run build --workspace frontend

# ---------- backend ----------
FROM eclipse-temurin:21-jdk AS backend
WORKDIR /src/backend
COPY backend/gradlew backend/settings.gradle.kts backend/build.gradle.kts backend/gradle.properties ./
COPY backend/gradle/ gradle/
RUN ./gradlew --no-daemon --quiet dependencies > /dev/null
COPY backend/src/ src/
RUN ./gradlew --no-daemon --quiet buildFatJar

# ---------- runtime ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /src/backend/build/libs/calendar-backend.jar app.jar
COPY --from=frontend /src/frontend/dist/ public/
ENV BACKEND_PORT=8080 \
    STATIC_DIR=/app/public
EXPOSE 8080
CMD ["java", "-jar", "/app/app.jar"]
