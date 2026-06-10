# ────────────────────────────────────────────
# Stage 1 : build Angular
# npm ci installe exactement les versions du lock file (reproductible)
# puis Angular CLI compile en mode production (tree-shaking, minification)
# ────────────────────────────────────────────
FROM node:20-alpine AS front-build

WORKDIR /src

COPY ./front/package*.json ./
RUN npm ci
COPY ./front .
RUN npx @angular/cli build --configuration=production

# ────────────────────────────────────────────
# Stage 2 : build Spring Boot
# -x test : on saute les tests ici (ils tournent en CI séparément)
# Le résultat est un fat JAR dans build/libs/
# ────────────────────────────────────────────
FROM gradle:8.7-jdk17 AS back-build

WORKDIR /src

COPY ./back .
RUN ./gradlew build -x test

# ────────────────────────────────────────────
# Stage front : sert les fichiers statiques Angular via Caddy
# L'image caddy:2-alpine gère déjà un user non-root en interne
# ────────────────────────────────────────────
FROM caddy:2-alpine AS front

# On copie uniquement les assets compilés, pas les sources
COPY --from=front-build /src/dist/microcrm/browser /app/front
COPY misc/docker/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

# ────────────────────────────────────────────
# Stage back : exécute le JAR Spring Boot
# eclipse-temurin JRE (pas JDK) : image plus légère, suffit pour exécuter
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
