FROM node:20-alpine AS front-build

WORKDIR /src

COPY ./front/package*.json ./
RUN npm ci
COPY ./front .
RUN npx @angular/cli build --configuration=production

FROM gradle:8.7-jdk17 AS back-build

WORKDIR /src

COPY ./back .
RUN ./gradlew build -x test

# ────────────────────────────────────────────
# Stage front : sert les fichiers statiques Angular via Caddy
# L'image caddy:2-alpine gère déjà un user non-root en interne
# ────────────────────────────────────────────
FROM caddy:2-alpine AS front

COPY --from=front-build /src/dist/microcrm/browser /app/front
COPY misc/docker/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

# ────────────────────────────────────────────
# Stage back : exécute le JAR Spring Boot
# ────────────────────────────────────────────
FROM eclipse-temurin:17-jre-jammy AS back

WORKDIR /app

COPY --from=back-build /src/build/libs/microcrm-0.0.1-SNAPSHOT.jar app.jar

# Créer un user non-root et lui donner la propriété du dossier de travail
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

# ────────────────────────────────────────────
# Stage standalone : front + back dans un seul conteneur via Supervisor
# ────────────────────────────────────────────
FROM alpine:3.21 AS standalone

WORKDIR /app

RUN apk add --no-cache supervisor caddy openjdk17-jre-headless libcap

COPY --from=front-build /src/dist/microcrm/browser /app/front
COPY --from=back-build /src/build/libs/microcrm-0.0.1-SNAPSHOT.jar /app/back/microcrm-0.0.1-SNAPSHOT.jar
COPY misc/docker/Caddyfile /app/Caddyfile
COPY misc/docker/supervisor.ini /app/supervisor.ini

# Permettre à Caddy de binder les ports 80/443 sans être root
# cap_net_bind_service autorise les ports < 1024 pour un user non-root
RUN setcap 'cap_net_bind_service=+ep' /usr/sbin/caddy

# Créer un user non-root et lui donner la propriété du dossier de travail
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 80 443 8080

CMD ["/usr/bin/supervisord", "-c", "/app/supervisor.ini"]