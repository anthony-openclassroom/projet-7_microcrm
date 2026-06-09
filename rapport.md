# Documentation CI/CD — MicroCRM

**Date :** 07 juin 2026 | **Auteur :** Anthony Gorski | **Option :** B — Scénario fictif Orion

---

## 1. Contexte

MicroCRM est une application de démonstration full-stack : un CRM simplifié permettant de gérer des individus et des organisations. Le dépôt est un monorepo GitHub avec un backend Spring Boot et un frontend Angular.

Ce document décrit les plans d'industrialisation, les corrections apportées au projet initial (Dockerfile, pipeline, qualité), et l'état actuel de la configuration CI/CD.

---

## 2. Analyse du projet

### 2.1 Stack technique

| Couche          | Technologie                | Version              |
| --------------- | -------------------------- | -------------------- |
| Langage back    | Java                       | 17 (LTS)             |
| Framework back  | Spring Boot                | 3.2.5                |
| Build back      | Gradle (wrapper)           | 8.7                  |
| Base de données | HSQLDB                     | In-memory, embarquée |
| Framework front | Angular                    | 17.3                 |
| Langage front   | TypeScript                 | 5.4                  |
| Tests back      | JUnit 5 + Spring Boot Test | —                    |
| Tests front     | Karma + Jasmine            | —                    |

### 2.2 Architecture

```mermaid
flowchart TB
    Browser(["🌐 Navigateur\n(Angular SPA)"])

    subgraph back["Backend — Spring Boot :8080"]
        Rest["Spring Data REST\n/persons · /organizations\n(HATEOAS, pagination)"]
        Repos["PersonRepository\nOrganizationRepository"]
        CORS["SpringDataRestCustomization\n⚠️ allowedOrigins = *"]
    end

    DB[("HSQLDB\nin-memory")]

    Browser -->|"HTTP :8080"| Rest
    Rest --> Repos
    Repos -->|"JPA / Hibernate"| DB
    CORS -.->|"filtre CORS"| Rest
```

**API exposée :** Spring Data REST génère automatiquement les endpoints REST avec HATEOAS. Aucune couche Controller custom — tout passe par les repositories.

**Données :** HSQLDB in-memory. Aucune persistance entre redémarrages. Un `InitialDataFixture` alimente la base au démarrage.

### 2.3 Commandes locales

```bash
# Backend
cd back && ./gradlew build                              # compile + tests + JAR
java -jar build/libs/microcrm-0.0.1-SNAPSHOT.jar       # démarre sur :8080

# Frontend
cd front && npm install && npm start                    # dev sur :4200
npm run build                                           # build prod → dist/microcrm/browser/

# Tests
cd back && ./gradlew test
cd front && npm test -- --no-watch --browsers=ChromeHeadlessNoSandbox
```

### 2.4 Problèmes identifiés et corrigés

**Dockerfile — corrections apportées :**

| Ligne | Problème initial                                                | Correction                                   |
| ----- | --------------------------------------------------------------- | -------------------------------------------- |
| 1     | `FROM node` — image non épinglée                                | `FROM node:20-alpine`                        |
| 10    | `FROM gradle:jdk17` — version non épinglée                      | `FROM gradle:8.7-jdk17`                      |
| 36    | `openjdk21-jre-headless` — mismatch avec le build Java 17       | `eclipse-temurin:17-jre-alpine`              |
| 40    | `EXPOSE 4200` sur le stage `back` — Spring Boot écoute sur 8080 | `EXPOSE 8080`                                |
| —     | Processus exécutés en `root`                                    | User non-root `appuser` + `setcap` sur Caddy |
| —     | `COPY --from=front / /` fragile dans `standalone`               | Install explicite des dépendances            |

**Autres points :**

- `front/src/app/config.ts:1` — `API_BASE_URL` hardcodée à `http://localhost:8080`. Fonctionne si les deux ports sont exposés, mais non paramétrable. À externaliser via Angular environments.
- `back/.../SpringDataRestCustomization.java:14` — CORS ouvert (`allowedOrigins("*")`). À restreindre en production.

### 2.5 Veille technologique

| Outil       | Version projet | Recommandée | Note                         |
| ----------- | -------------- | ----------- | ---------------------------- |
| Spring Boot | 3.2.5          | 3.4.x       | 3.2.x en fin de support      |
| Java        | 17 LTS         | 21 LTS      | Fonctionnel, Java 21 préféré |
| Gradle      | 8.7            | 8.10+       | Mettre à jour                |
| Angular     | 17.3           | 18+         | 17 en maintenance            |
| Node.js     | 20 LTS         | 20 LTS      | Épinglé ✓                    |

---

## 3. Pipeline CI/CD

### 3.1 Flux

```mermaid
flowchart LR
    trigger(["Push / PR\nvers main"])

    subgraph parallel["En parallèle"]
        B["Backend\nBuild + Tests\n./gradlew build"]
        F["Frontend\nBuild + Tests\nnpm ci · npm test · npm run build"]
    end

    S["SonarCloud\nAnalyse qualité"]
    D["Build & Push\nImages Docker → GHCR"]
    R["GitHub Release\n(tags v* uniquement)"]

    trigger --> parallel
    B --> S
    F --> S
    S --> D
    D --> R
```

Les jobs Backend et Frontend tournent en parallèle. SonarCloud attend les deux. Le CD (Docker + Release) ne s'exécute que sur `push` vers `main` — les pull requests s'arrêtent après Sonar.

### 3.2 Workflow — `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD

on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

jobs:
    backend:
        runs-on: ubuntu-latest
        defaults:
            run:
                working-directory: back
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-java@v4
              with:
                  java-version: "17"
                  distribution: temurin
                  cache: gradle
            - run: chmod +x gradlew && ./gradlew build
            - uses: actions/upload-artifact@v4
              with:
                  name: backend-jar
                  path: back/build/libs/*.jar

    frontend:
        runs-on: ubuntu-latest
        defaults:
            run:
                working-directory: front
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: "20"
                  cache: npm
                  cache-dependency-path: front/package-lock.json
            - run: npm ci
            - run: npm test -- --no-watch --browsers=ChromeHeadlessNoSandbox
            - run: npm run build
            - run: npm audit --audit-level=high
              continue-on-error: true
            - uses: actions/upload-artifact@v4
              with:
                  name: frontend-dist
                  path: front/dist/microcrm/browser/

    sonar:
        runs-on: ubuntu-latest
        needs: [backend, frontend]
        continue-on-error: true
        steps:
            - uses: actions/checkout@v4
              with:
                  fetch-depth: 0
            - uses: actions/setup-java@v4
              with:
                  java-version: "17"
                  distribution: temurin
                  cache: gradle
            - run: cd back && chmod +x gradlew && ./gradlew test jacocoTestReport
            - uses: SonarSource/sonarqube-scan-action@v6
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
                  SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
              with:
                  args: >
                      -Dsonar.sources=back/src/main,front/src
                      -Dsonar.java.binaries=back/build/classes
                      -Dsonar.coverage.jacoco.xmlReportPaths=back/build/reports/jacoco/test/jacocoTestReport.xml
                      -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/*.spec.ts

    docker:
        runs-on: ubuntu-latest
        needs: [sonar]
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        permissions:
            contents: read
            packages: write
        steps:
            - uses: actions/checkout@v4
            - uses: docker/setup-buildx-action@v3
            - uses: docker/login-action@v3
              with:
                  registry: ghcr.io
                  username: ${{ github.actor }}
                  password: ${{ secrets.GITHUB_TOKEN }}
            - id: meta-back
              uses: docker/metadata-action@v5
              with:
                  images: ghcr.io/${{ github.repository_owner }}/orion-microcrm-back
                  tags: |
                      type=raw,value=latest
                      type=sha,prefix=
            - uses: docker/build-push-action@v6
              with:
                  context: .
                  target: back
                  push: true
                  tags: ${{ steps.meta-back.outputs.tags }}
                  cache-from: type=gha
                  cache-to: type=gha,mode=max
            - id: meta-front
              uses: docker/metadata-action@v5
              with:
                  images: ghcr.io/${{ github.repository_owner }}/orion-microcrm-front
                  tags: |
                      type=raw,value=latest
                      type=sha,prefix=
            - uses: docker/build-push-action@v6
              with:
                  context: .
                  target: front
                  push: true
                  tags: ${{ steps.meta-front.outputs.tags }}
                  cache-from: type=gha
                  cache-to: type=gha,mode=max

    release:
        runs-on: ubuntu-latest
        needs: [docker]
        if: startsWith(github.ref, 'refs/tags/v')
        steps:
            - uses: actions/checkout@v4
            - uses: actions/download-artifact@v4
              with:
                  name: backend-jar
                  path: artifacts/
            - uses: actions/download-artifact@v4
              with:
                  name: frontend-dist
                  path: artifacts/front/
            - run: cd artifacts/front && zip -r ../microcrm-front-${{ github.ref_name }}.zip .
            - uses: softprops/action-gh-release@v2
              with:
                  files: |
                      artifacts/*.jar
                      artifacts/microcrm-front-${{ github.ref_name }}.zip
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 3.3 Secrets requis

| Secret         | Usage                       | Configuration                           |
| -------------- | --------------------------- | --------------------------------------- |
| `GITHUB_TOKEN` | Login GHCR + release GitHub | Automatique — fourni par GitHub Actions |
| `SONAR_TOKEN`  | Analyse SonarCloud          | `Settings > Secrets > Actions`          |

La configuration Sonar (clé projet, organisation) est dans `sonar-project.properties` — aucune variable GitHub requise.

### 3.4 Configuration Sonar et JaCoCo

`sonar-project.properties` à la racine :

```properties
sonar.projectKey=microcrm
sonar.organization=anthony-openclassroom
sonar.sources=back/src/main,front/src
sonar.tests=back/src/test
sonar.java.binaries=back/build/classes
sonar.exclusions=**/node_modules/**,**/dist/**,**/*.spec.ts
```

JaCoCo dans `back/build.gradle` :

```groovy
plugins {
    // ... plugins existants ...
    id 'jacoco'
}
jacocoTestReport {
    dependsOn test
    reports { xml.required = true }
}
```

---

## 4. Conteneurisation

### 4.1 Dockerfile

Build multi-étapes avec trois cibles. Points clés :

- Images épinglées sur des versions précises (`node:20-alpine`, `gradle:8.7-jdk17`, `eclipse-temurin:17-jre-alpine`)
- Stages `back` et `standalone` : exécution en user non-root (`appuser`) — `setcap cap_net_bind_service` sur Caddy pour binder 80/443 sans root
- Stage `standalone` : install explicite des dépendances plutôt que `COPY --from=image / /`

```dockerfile
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
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

FROM alpine:3.19 AS standalone
WORKDIR /app
RUN apk add --no-cache supervisor caddy openjdk17-jre-headless libcap
COPY --from=front-build /src/dist/microcrm/browser /app/front
COPY --from=back-build /src/build/libs/microcrm-0.0.1-SNAPSHOT.jar /app/back/microcrm-0.0.1-SNAPSHOT.jar
COPY misc/docker/Caddyfile /app/Caddyfile
COPY misc/docker/supervisor.ini /app/supervisor.ini
RUN setcap 'cap_net_bind_service=+ep' /usr/sbin/caddy
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser
EXPOSE 80 443 8080
CMD ["/usr/bin/supervisord", "-c", "/app/supervisor.ini"]
```

### 4.2 docker-compose.yml

```yaml
services:
    back:
        build:
            context: .
            target: back
        ports:
            - "8080:8080"
        healthcheck:
            test: ["CMD", "wget", "-qO-", "http://localhost:8080/persons"]
            interval: 10s
            retries: 5

    front:
        build:
            context: .
            target: front
        ports:
            - "80:80"
            - "443:443"
        depends_on:
            back:
                condition: service_healthy
```

```bash
docker-compose up --build
```

---

## 5. Plan de testing

### 5.1 Tests existants

**Backend :**

| Classe                            | Annotation        | Ce qui est testé                       |
| --------------------------------- | ----------------- | -------------------------------------- |
| `MicroCRMApplicationTests`        | `@SpringBootTest` | Le contexte Spring démarre sans erreur |
| `PersonRepositoryIntegrationTest` | `@DataJpaTest`    | `findByEmail` via HSQLDB in-memory     |

**Frontend :**

| Fichier spec                             | Ce qui est testé          |
| ---------------------------------------- | ------------------------- |
| `app.component.spec.ts`                  | Création, titre, rendu H1 |
| `main-dashboard.component.spec.ts`       | Création du composant     |
| `person-details.component.spec.ts`       | Création du composant     |
| `organization-details.component.spec.ts` | Création du composant     |
| `person.service.spec.ts`                 | Instanciation du service  |
| `organization.service.spec.ts`           | Instanciation du service  |

Tous les tests front utilisent `HttpClientTestingModule` (mock HTTP) et `RouterTestingModule`.

### 5.2 Fréquence et objectifs

| Événement                | Tests exécutés            | Objectif                     |
| ------------------------ | ------------------------- | ---------------------------- |
| Push vers `main`         | Back + front + Sonar + CD | Validation avant déploiement |
| Pull request vers `main` | Back + front + Sonar      | Non-régression avant merge   |

**Limite :** les tests actuels sont des smoke tests (instanciation et démarrage de contexte). Des tests REST via `MockMvc` et des tests de comportement Angular sont à ajouter pour atteindre une couverture métier significative.

---

## 6. Plan de sécurité finalisé

**Date de finalisation :** 09 juin 2026 | **Sources :** SonarCloud, analyse statique du code, npm audit, OWASP Top 10 2021

---

### 6.1 Périmètre analysé

| Couche | Fichiers analysés | Lignes de code |
|---|---|---|
| Back-end Java | 7 fichiers `.java` | 299 lignes |
| Front-end TypeScript | 9 fichiers `.ts` (hors specs) | 381 lignes |
| Infrastructure | Dockerfile, docker-compose, Caddyfile | — |

---

### 6.2 Inventaire des vulnérabilités et anomalies (SonarCloud + analyse statique)

> **Distinction importante :** une **vulnérabilité** peut être exploitée pour compromettre l'application. Un **code smell** dégrade la maintenabilité sans impact sécurité direct. Les deux sont tracés ici avec leur catégorie OWASP.

#### Back-end

| # | Fichier | Problème | Type | Criticité | OWASP 2021 | Statut |
|---|---|---|---|---|---|---|
| B1 | `SpringDataRestCustomization.java:14` | `allowedOrigins("*")` — toute origine acceptée | Vulnérabilité | 🔴 Critique | A05 — Security Misconfiguration | En cours |
| B2 | `PersonRepository.java`, `OrganizationRepository.java` | `@CrossOrigin` redondant avec la config globale CORS | Code Smell | 🟡 Modéré | A05 | En cours |
| B3 | API entière | Aucune authentification ni autorisation — CREATE/UPDATE/DELETE ouverts à tous | Vulnérabilité | 🔴 Critique | A01 — Broken Access Control | Hors scope v1 |
| B4 | `Person.java`, `Organization.java` | Aucune validation des champs (`@NotNull`, `@Size`, `@Email`) | Vulnérabilité | 🟠 Élevé | A03 — Injection / A04 — Insecure Design | En cours |
| B5 | `SpringDataRestCustomization.java:13` | `config.exposeIdsFor()` — IDs internes exposés dans l'API | Security Hotspot | 🟡 Modéré | A01 | Accepté |
| B6 | `Person.java:3` | Utilisation de `java.util.Date` (déprécié depuis Java 8) | Code Smell | 🟢 Faible | — | À planifier |
| B7 | Tests | 2 classes de test, couverture ~16 % — smoke tests uniquement | Qualité | 🟠 Élevé | A04 — Insecure Design | En cours |

#### Front-end

| # | Fichier | Problème | Type | Criticité | OWASP 2021 | Statut |
|---|---|---|---|---|---|---|
| F1 | `config.ts:1` | `API_BASE_URL = "http://localhost:8080"` — URL hardcodée | Vulnérabilité | 🟠 Élevé | A05 — Security Misconfiguration | En cours |
| F2 | `person.service.ts`, `organization.service.ts` | Aucune gestion d'erreur HTTP — Promise rejets silencieux | Code Smell | 🟡 Modéré | A09 — Logging Failures | En cours |
| F3 | Services (multiple) | Cast `as any` — contournement du typage TypeScript | Code Smell | 🟡 Modéré | A04 | En cours |
| F4 | `organization-details.component.html:32` | Label sans `for` — inaccessibilité | Code Smell | 🟡 Modéré | — | ✅ Corrigé |
| F5 | `organization-details.component.ts:36` | `parseInt` global au lieu de `Number.parseInt` | Code Smell | 🟢 Faible | — | ✅ Corrigé |
| F6 | `person-details.component.ts:33` | Opération async dans le constructeur | Code Smell | 🟠 Élevé (Reliability) | A04 | ✅ Corrigé |
| F7 | `person-details.component.ts:43` | `parseInt` global au lieu de `Number.parseInt` | Code Smell | 🟢 Faible | — | ✅ Corrigé |
| F8 | `@angular/core ≤18.2.14` | XSS via attributs i18n, SVG — 29 vulnérabilités HIGH npm | Vulnérabilité | 🟠 Élevé | A03 — XSS | Tracé — Angular 21 requis |

#### Infrastructure

| # | Élément | Problème | Type | Criticité | Statut |
|---|---|---|---|---|---|
| I1 | Dockerfile (tous stages) | Conteneurs exécutés en `root` | Vulnérabilité | 🔴 Critique | ✅ Corrigé |
| I2 | Images Docker | Versions non épinglées (`FROM node`) | Vulnérabilité | 🟠 Élevé | ✅ Corrigé |
| I3 | `eclipse-temurin:17-jre-alpine` | Incompatibilité ARM64 | Bug | 🟠 Élevé | ✅ Corrigé |
| I4 | `alpine:3.19` | Version EOL (novembre 2025) | Vulnérabilité | 🟠 Élevé | ✅ Corrigé |
| I5 | `docker-compose.elk.yml` | `xpack.security.enabled=false` — usage local uniquement | Config | 🔴 Critique (si exposé) | Documenté |

---

### 6.3 Duplications de code identifiées

SonarCloud signale une duplication structurelle significative entre `person.service.ts` et `organization.service.ts` :

| Pattern dupliqué | Occurrence | Impact |
|---|---|---|
| Structure `fetchById` + appel relations | 2 × | Toute modification doit être faite en double |
| Structure `fetchAll` + extraction `_embedded` | 2 × | Couplage implicite à la structure HATEOAS |
| Structure `save` (POST si nouveau, PUT si existant) | 2 × | Logique métier répétée |
| Gestion `firstValueFrom(response)` | 10+ appels | Absence d'abstraction commune |

**Refactoring proposé :** une classe `AbstractRestService<T>` ou un helper `http.get<T>()` commun réduirait la duplication de ~40 %.

---

### 6.4 Zones à forte complexité

| Fichier | Méthode | Complexité | Raison |
|---|---|---|---|
| `person-details.component.ts` | Composant global | Élevée | Gère la logique CRUD + organisations liées + refresh |
| `person.service.ts` | `save()` | Modérée | Branchement POST/PUT + re-fetch des organisations |
| `organization.service.ts` | `save()` | Modérée | Même pattern que `person.service.ts` |
| `SpringDataRestCustomization.java` | `configureRepositoryRestConfiguration` | Faible | Simple mais concentre la config CORS critique |

---

### 6.5 Couverture de tests

| Couche | Tests existants | Ce qui est couvert | Ce qui manque |
|---|---|---|---|
| Back — Unitaire | `MicroCRMApplicationTests` (`@SpringBootTest`) | Démarrage du contexte Spring | Logique métier, validation, endpoints |
| Back — Intégration | `PersonRepositoryIntegrationTest` (`@DataJpaTest`) | `findByEmail` sur HSQLDB | Tous les autres endpoints REST, codes HTTP, pagination |
| Front — Unitaire | 6 fichiers `.spec.ts` | Instanciation des composants/services | Comportement UI, appels HTTP, gestion d'erreur |

**Couverture estimée :**
- Back : ~16 % (47 lignes de tests / 299 lignes de production)
- Front : ~5 % (instanciation uniquement, aucun test de comportement)

**Cible recommandée :** 60 % back, 40 % front (tests comportementaux avec `MockMvc` et `ComponentFixture`).

---

### 6.6 Règles critiques violées (SonarSource)

| Règle SonarSource | Langage | Sévérité | Occurrence dans le projet |
|---|---|---|---|
| `java:S2092` — Cookie sans flag Secure | Java | Critical | Non applicable (pas de session), mais à surveiller si auth ajoutée |
| `java:S5122` — CORS trop permissif | Java | Critical | `allowedOrigins("*")` dans `SpringDataRestCustomization` |
| `typescript:S2486` — Promise rejetée non gérée | TypeScript | Major | Tous les appels HTTP dans les services |
| `typescript:S4325` — Cast `as any` inutile | TypeScript | Minor | Services Angular |
| `Web:S1128` — Label sans contrôle associé | HTML | Major | ✅ Corrigé (`organization-details.component.html`) |

---

### 6.7 Gestion des secrets

| Secret | Stockage | Visibilité |
|---|---|---|
| `SONAR_TOKEN` | GitHub Secrets (Settings → Secrets → Actions) | Masqué dans les logs CI |
| `GITHUB_TOKEN` | Automatique — injecté par GitHub Actions | Masqué dans les logs CI |

Aucune credential dans les images Docker, les fichiers committés, ou `application.properties`. La configuration Sonar (`sonar-project.properties`) ne contient que des valeurs publiques (clé de projet, organisation).

---

### 6.8 Analyse des risques — tableau de synthèse

**C = Fréquence (F) × Gravité (G)** | 🟢 1–4 Faible | 🟡 5–8 Modéré | 🟠 9–12 Élevé | 🔴 13–16 Critique

| Risque | F | G | C | Niveau | Statut |
|---|:---:|:---:|:---:|---|---|
| API sans authentification — opérations destructives ouvertes | 4 | 4 | **16** | 🔴 Critique | Hors scope v1 — à adresser avant mise en prod |
| CORS `allowedOrigins("*")` | 3 | 3 | **9** | 🟠 Élevé | En cours |
| Aucune validation des champs API (injection, longueur) | 3 | 3 | **9** | 🟠 Élevé | En cours |
| `API_BASE_URL` hardcodée | 3 | 2 | **6** | 🟡 Modéré | En cours |
| Vulnérabilités Angular XSS (HIGH, npm audit) | 2 | 3 | **6** | 🟡 Modéré | Tracé — Angular 21 |
| Couverture de tests insuffisante | 2 | 3 | **6** | 🟡 Modéré | En cours |
| `@CrossOrigin` redondant sur les repositories | 2 | 2 | **4** | 🟢 Faible | En cours |
| Quality Gate SonarCloud non bloquant (`continue-on-error: true`) | 2 | 2 | **4** | 🟢 Faible | En cours |
| `java.util.Date` déprécié | 1 | 1 | **1** | 🟢 Faible | À planifier |
| Conteneurs en `root` | 3 | 3 | **9** | 🟠 Élevé | ✅ Corrigé |
| Images Docker non épinglées | 4 | 2 | **8** | 🟡 Modéré | ✅ Corrigé |
| Alpine EOL (`3.19`) | 3 | 2 | **6** | 🟡 Modéré | ✅ Corrigé |
| Mismatch JDK (build 17 / runtime 21) | 3 | 2 | **6** | 🟡 Modéré | ✅ Corrigé |
| Async dans constructeur Angular | 2 | 2 | **4** | 🟢 Faible | ✅ Corrigé |
| Label sans `for` (accessibilité) | 3 | 1 | **3** | 🟢 Faible | ✅ Corrigé |

---

### 6.9 Plan d'action priorisé

| Priorité | Action | Effort | Impact sécurité |
|---|---|---|---|
| **P0 — Avant mise en prod** | Ajouter Spring Security (authentification + autorisation) | Élevé | 🔴 Critique |
| **P1 — Court terme** | Restreindre CORS : remplacer `*` par l'URL du front | Faible | 🟠 Élevé |
| **P1 — Court terme** | Ajouter validation Bean (`@NotNull`, `@Size`, `@Email`) sur `Person` et `Organization` | Faible | 🟠 Élevé |
| **P1 — Court terme** | Externaliser `API_BASE_URL` via Angular `environment.ts` | Faible | 🟡 Modéré |
| **P2 — Moyen terme** | Ajouter gestion d'erreur dans les services Angular (`catch`) | Modéré | 🟡 Modéré |
| **P2 — Moyen terme** | Supprimer `@CrossOrigin` redondant sur les repositories | Faible | 🟢 Faible |
| **P2 — Moyen terme** | Écrire tests `MockMvc` pour les endpoints REST back | Modéré | Qualité |
| **P2 — Moyen terme** | Activer Quality Gate SonarCloud bloquant | Faible | Qualité |
| **P3 — Long terme** | Migrer Angular 17 → 18+ (corrige 29 vulnérabilités HIGH npm) | Élevé | 🟡 Modéré |
| **P3 — Long terme** | Remplacer `java.util.Date` par `LocalDateTime` | Modéré | Maintenabilité |
| **P3 — Long terme** | Factoriser `PersonService` / `OrganizationService` (réduire duplication ~40 %) | Modéré | Maintenabilité |

---

## 7. Versioning et releases

**Politique SemVer :** `vMAJEUR.MINEUR.PATCH`

| Incrément | Quand                                   |
| --------- | --------------------------------------- |
| `MAJEUR`  | Rupture de l'API ou du comportement     |
| `MINEUR`  | Nouvelle fonctionnalité rétrocompatible |
| `PATCH`   | Correction de bug ou de sécurité        |

La release est déclenchée **manuellement** par création d'un tag :

```bash
git tag v1.0.0 && git push origin v1.0.0
```

Le workflow `release` publie le JAR et l'archive Angular sur GitHub Releases. Les images Docker sont taguées et publiées sur **GHCR** (`ghcr.io/anthony-openclassroom/orion-microcrm-back|front`).

Pas de release automatique à chaque commit. Modèle `main` + tags — pas de branches par release.

---

## 8. Métriques DORA et KPI opérationnels

**Période d'observation :** 07–09 juin 2026 | **Releases analysées :** v1.0.0, v1.0.1, v1.1.0 | **Source :** GitHub Actions, git log

### 8.1 Les 4 métriques DORA

#### Méthode de calcul

| Métrique | Définition retenue | Source de données |
|---|---|---|
| Lead Time | Durée entre le dernier commit d'un batch et la fin du job `docker` (image disponible sur GHCR) | GitHub Actions — durée cumulée des jobs |
| Deployment Frequency | Nombre de déploiements GHCR réussis par jour | GitHub Actions — runs `push` sur `main` avec job `docker` vert |
| MTTR | Durée entre le commit qui introduit un défaut (pipeline rouge) et le commit de correction | git log — paires commit cassant / commit `fix` |
| Change Failure Rate | (Nombre de runs nécessitant un fix correctif immédiat / total des runs sur `main`) × 100 | git log — commits `fix(ci)` ou `fix(docker)` correctifs |

#### Résultats mesurés

| Métrique DORA | Valeur mesurée | Classe DORA | Commentaire |
|---|---|---|---|
| **Lead Time for Changes** | ~7 min | Elite (< 1h) | Pipeline : back (~55 s) + front (~52 s) ‖ sonar (~52 s) → docker (~3 min). Pas de serveur prod — le "déploiement" est la publication GHCR. |
| **Deployment Frequency** | 3 releases en 3 jours | Elite (> 1/jour) | v1.0.0, v1.0.1, v1.1.0. Plusieurs images GHCR publiées par jour pendant le développement actif. |
| **MTTR** | ~10–15 min | Elite (< 1h) | Incidents observés : clé Sonar manquante, mauvais chemin d'artefact, seuil npm audit. Tous corrigés en < 15 min. |
| **Change Failure Rate** | ~27 % | Low (> 15 %) | 4 corrections de pipeline sur ~15 runs estimés. Élevé mais attendu : période d'initialisation du pipeline (configuration de zéro). Cible < 15 % une fois le pipeline stabilisé. |

> **Note sur le CFR :** les 4 commits correctifs concernent exclusivement la configuration CI/CD (non le code applicatif). Le pipeline applicatif (tests JUnit, tests Angular) n'a jamais été la cause d'un échec — la qualité du code source est stable.

---

### 8.2 KPI opérationnels du pipeline

Ces indicateurs complètent les métriques DORA en expliquant d'où viennent les durées et en traçant la qualité au-delà de la simple couleur verte/rouge.

| KPI | Valeur | Méthode de mesure |
|---|---|---|
| Durée build backend (Gradle compile + tests + JaCoCo) | ~55 s | GitHub Actions — step `./gradlew build`, job `backend` |
| Durée build frontend (npm ci + Karma + ng build + audit) | ~52 s | GitHub Actions — job `frontend` |
| Durée analyse SonarCloud | ~52 s | GitHub Actions — job `sonar` |
| Durée build + push images Docker (back + front) | ~3 min | GitHub Actions — job `docker` |
| Durée totale pipeline (Lead Time CI/CD) | ~6–8 min | Somme des jobs en séquence critique |
| Issues SonarCloud Reliability résolues | 4 | SonarCloud — catégorie Reliability, fermeture le 09/06/2026 |
| Vulnérabilités npm restantes (HIGH) | 29 | `npm audit` — Angular core ≤18, correctif = migration Angular 21 |
| Vulnérabilités npm corrigées (non-breaking) | 33 | `npm audit fix` — 79 → 46 |

---

### 8.3 Indicateurs ELK (applicatifs)

Les métriques DORA mesurent le pipeline. ELK mesure ce qui se passe dans l'application une fois déployée. Ces deux niveaux sont complémentaires.

| Indicateur ELK | Source Kibana | Utilité |
|---|---|---|
| Volume de logs / minute | Index `microcrm-spring-boot-*` — date histogram sur `@timestamp` | Détecter les pics d'activité anormaux |
| Taux d'erreurs applicatives | Filtre `log_level: ERROR` — proportion sur total | Mesurer la stabilité du back-end en conditions réelles |
| Distribution des niveaux (INFO / WARN / ERROR) | Terms aggregation sur `log_level` | Tableau de bord de santé applicative |
| Status HTTP Caddy (2xx / 4xx / 5xx) | Index `microcrm-caddy-*` — terms aggregation sur `status` | Détecter les erreurs front (404 de routes manquantes, 5xx backend) |
| Temps de réponse moyen (front) | Avg aggregation sur le champ `duration` dans les logs Caddy | Indicateur de performance perçue par l'utilisateur |

> **État actuel :** la stack ELK est déployée localement et opérationnelle (voir section 10). Les valeurs de référence (baseline) seront établies après 48 h d'utilisation en conditions normales.

---

## 9. Sauvegarde et mises à jour

**Sauvegarde :**

- Code → Git (GitHub)
- Artefacts → GitHub Releases (JAR + archive front) à chaque tag `v*`
- Images → GHCR (`latest` + SHA + `vX.Y.Z`)
- HSQLDB in-memory — pas de données persistantes à sauvegarder

**Mises à jour à planifier :**

- Spring Boot 3.2.x → 3.4.x (fin de support)
- Angular 17 → 18+ (version en maintenance)
- Gradle 8.7 → 8.10+
- Tags des images de base Docker après chaque patch de sécurité
- Actions GitHub (`@v4`, `@v6`) — suivre les release notes

---

## 10. Centralisation des logs — Stack ELK

**Date d'intégration :** 09 juin 2026

### 10.1 Contexte et objectifs

L'application ne disposait d'aucune centralisation des logs. Les sorties du back-end (stdout Spring Boot) et du front-end (accès HTTP Caddy) n'étaient accessibles que via `docker compose logs`, sans historique, sans agrégation, et sans visibilité sur les erreurs en temps réel.

L'objectif de cette étape est de collecter, centraliser et visualiser les logs applicatifs via une stack ELK (Elasticsearch, Logstash, Kibana) déployée localement via Docker Compose.

**Périmètre :**

- Logs Spring Boot (niveau, logger, message, stack traces) → structurés en JSON et envoyés à Logstash via TCP
- Access logs Caddy (méthode, URL, status HTTP, durée) → écrits en JSON, collectés par Filebeat et relayés à Logstash
- Tableau de bord Kibana : volume de logs, distribution des niveaux, erreurs, status HTTP

**Hors périmètre :** ELK n'est pas intégré au pipeline CI/CD (trop coûteux en ressources, usage local uniquement).

---

### 10.2 Architecture

```
Spring Boot ──TCP:5000──► Logstash ──► Elasticsearch
Caddy ──JSON file──► Volume ──► Filebeat ──Beats:5044──► Logstash
                                                        Kibana :5601
```

Logstash est le point central de convergence : il reçoit les deux flux, les normalise, et les écrit dans Elasticsearch avec des index journaliers séparés par source (`microcrm-spring-boot-YYYY.MM.dd`, `microcrm-caddy-YYYY.MM.dd`).

---

### 10.3 Composants et versions

| Composant     | Image                                           | Version | Rôle                               |
| ------------- | ----------------------------------------------- | ------- | ---------------------------------- |
| Elasticsearch | `docker.elastic.co/elasticsearch/elasticsearch` | 8.13.4  | Stockage et indexation des logs    |
| Logstash      | `docker.elastic.co/logstash/logstash`           | 8.13.4  | Ingestion, transformation, routage |
| Kibana        | `docker.elastic.co/kibana/kibana`               | 8.13.4  | Visualisation et dashboards        |
| Filebeat      | `docker.elastic.co/beats/filebeat`              | 8.13.4  | Collecte des logs Caddy            |

La cohérence de version (8.13.4 sur tous les composants) est obligatoire — les protocoles internes Elastic évoluent entre versions majeures et mineures.

---

### 10.4 Modifications apportées au projet

#### Back-end Spring Boot

**`back/build.gradle`** — ajout de la dépendance :

```groovy
implementation 'net.logstash.logback:logstash-logback-encoder:7.4'
```

La version 7.4 est retenue pour sa compatibilité avec Logback 1.4.14 (embarqué par Spring Boot 3.2.5). La version 8.x cible Logback 1.5+ et ne s'applique pas ici.

Le fichier `back/gradle.lockfile` a été régénéré via `./gradlew dependencies --write-locks` pour refléter la nouvelle dépendance — le projet utilise le verrouillage de dépendances Gradle.

**`back/src/main/resources/logback-spring.xml`** (créé) — configuration Logback conditionnée par profil Spring :

- Profil `default` : logs texte lisibles en console (développement local)
- Profil `docker` : logs JSON envoyés via `LogstashTcpSocketAppender` (port TCP 5000) + console JSON

L'appender TCP est configuré avec une durée de keepalive (5 min) et un délai de reconnexion (10 s) pour tolérer un démarrage de Logstash plus tardif que celui de Spring Boot. Les champs `app` et `env` sont injectés dans chaque message pour faciliter le filtrage multi-applications dans Kibana.

**`docker-compose.yml`** — ajouts :

```yaml
back:
    environment:
        - SPRING_PROFILES_ACTIVE=docker
front:
    volumes:
        - caddy-logs:/var/log/caddy
volumes:
    caddy-logs:
```

#### Front-end Caddy

**`misc/docker/Caddyfile`** — ajout du bloc `log` :

```
log {
  output file /var/log/caddy/access.log { roll_size 10mb; roll_keep 3 }
  format json
}
```

Caddy écrit chaque requête HTTP en JSON dans le fichier de log partagé. La rotation automatique plafonne l'usage disque à 30 Mo.

---

### 10.5 Fichiers créés

| Fichier                                    | Rôle                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `docker-compose.elk.yml`                   | Services Elasticsearch, Logstash, Kibana, Filebeat                          |
| `misc/elk/logstash/pipeline/logstash.conf` | Pipeline Logstash : 2 inputs, filtre de normalisation, sortie Elasticsearch |
| `misc/elk/filebeat/filebeat.yml`           | Surveillance du fichier de log Caddy, envoi vers Logstash                   |

---

### 10.6 Démarrage

```bash
# Stack complète (app + ELK)
docker compose -f docker-compose.yml -f docker-compose.elk.yml up --build

# Stack app seule (sans ELK)
docker compose up --build
```

Kibana est accessible sur `http://localhost:5601`. Après le premier démarrage, créer une **Data View** sur le pattern `microcrm-*` avec `@timestamp` comme champ de date.

Ressources requises : environ 2 Go de RAM supplémentaires pour Elasticsearch (512 Mo JVM) et Logstash (256 Mo JVM).

---

### 10.7 Points de vigilance

| Point                             | Détail                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Sécurité X-Pack                   | `xpack.security.enabled=false` — désactivé pour usage local uniquement. À ne jamais désactiver en production.                |
| Filebeat en root                  | Nécessaire pour lire les fichiers de log Caddy (uid différent). Pratique documentée et acceptée pour les agents de collecte. |
| ELK hors CI/CD                    | `docker-compose.elk.yml` est délibérément absent du workflow GitHub Actions.                                                 |
| Logs non persistés entre rebuilds | Le volume `elasticsearch-data` est nommé — il persiste entre `down`/`up`. Un `down -v` supprime les logs indexés.            |

---

## Livrables

| Livrable               | Emplacement                                  |
| ---------------------- | -------------------------------------------- |
| Workflow CI/CD         | `.github/workflows/ci-cd.yml`                |
| Dockerfile             | `Dockerfile`                                 |
| Docker Compose (app)   | `docker-compose.yml`                         |
| Docker Compose (ELK)   | `docker-compose.elk.yml`                     |
| Pipeline Logstash      | `misc/elk/logstash/pipeline/logstash.conf`   |
| Configuration Filebeat | `misc/elk/filebeat/filebeat.yml`             |
| Configuration Logback  | `back/src/main/resources/logback-spring.xml` |
| Configuration Sonar    | `sonar-project.properties`                   |
| Documentation          | `rapport.md`                                 |
