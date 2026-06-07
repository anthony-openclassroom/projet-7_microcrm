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

FROM caddy:2-alpine AS front

COPY --from=front-build /src/dist/microcrm/browser /app/front
COPY misc/docker/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

FROM eclipse-temurin:17-jre-alpine AS back

WORKDIR /app

COPY --from=back-build /src/build/libs/microcrm-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

FROM alpine:3.19 AS standalone

WORKDIR /app

RUN apk add --no-cache supervisor caddy openjdk17-jre-headless

COPY --from=front-build /src/dist/microcrm/browser /app/front
COPY --from=back-build /src/build/libs/microcrm-0.0.1-SNAPSHOT.jar /app/back/microcrm-0.0.1-SNAPSHOT.jar
COPY misc/docker/Caddyfile /app/Caddyfile
COPY misc/docker/supervisor.ini /app/supervisor.ini

EXPOSE 80 443 8080

CMD ["/usr/bin/supervisord", "-c", "/app/supervisor.ini"]
