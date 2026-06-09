# Plan de mise à jour — MicroCRM

Voir [veilleinfo.md](veilleinfo.md) pour le suivi des versions et l'état du support des dépendances.

---

## Procédure générale

1. Créer une branche `chore/update-<composant>-<version>`
2. Appliquer la mise à jour
3. Lancer les tests (`./gradlew test` ou `npm test`)
4. Vérifier la couverture (91.5 % lignes back et front — ne pas régresser)
5. Créer une PR → pipeline CI valide → merge
6. Tagger une release `PATCH` si la mise à jour est un correctif de sécurité

---

## Back-end (Gradle)

```bash
# Voir les dépendances obsolètes
cd back && ./gradlew dependencyUpdates

# Après modification de build.gradle :
# 1. Régénérer le lockfile (obligatoire — le projet utilise dependencyLocking)
./gradlew dependencies --write-locks

# 2. Valider
./gradlew test
```

### Priorités back-end

| Dépendance | Version actuelle | Action recommandée | Priorité |
|---|---|---|---|
| Spring Boot | 3.2.5 | → 3.4.x (3.2.x fin de support OSS) | 🟠 Élevé |
| Java | 17 LTS | → 21 LTS (meilleures perfs G1/ZGC) | 🟡 Modéré |
| Gradle | 8.7 | → 8.10+ | 🟢 Faible |
| `logstash-logback-encoder` | 7.4 | → 8.x si upgrade Logback (Spring Boot 3.4+) | Lors du upgrade Spring Boot |

---

## Front-end (npm)

```bash
# Voir les packages obsolètes
cd front && npm outdated

# Voir les vulnérabilités
npm audit

# Appliquer les patches non-breaking (correctifs de sécurité)
npm audit fix

# Vérifier que les tests passent après
npm test -- --no-watch --browsers=ChromeHeadlessNoSandbox

# Vérifier que le build prod compile
npm run build
```

### Migration Angular 17 → 18 (priorité élevée)

```bash
# Résout 29 vulnérabilités HIGH npm
npx @angular/cli update @angular/core@18 @angular/cli@18

# Vérifier la compatibilité RxJS, Zone.js
npm test -- --no-watch
npm run build
```

> Migration Node.js 20 → 22 recommandée en même temps que Angular 17 → 18.

### Priorités front-end

| Dépendance | Version actuelle | Action | Priorité |
|---|---|---|---|
| Angular | 17.3 | → 18+ (résout 29 CVE HIGH npm) | 🟠 Élevé |
| Node.js | 20 LTS | → 22 LTS (20 EOL avril 2026) | 🟠 Élevé |
| TypeScript | 5.4 | Suit la migration Angular | Lors du upgrade Angular |

---

## Images Docker

```bash
# Vérifier les nouvelles versions sur hub.docker.com
# Mettre à jour les tags dans Dockerfile :

FROM node:20-alpine        # → node:22-alpine (après migration Angular)
FROM gradle:8.7-jdk17      # → gradle:8.10-jdk17 (si disponible)
FROM eclipse-temurin:17-jre-jammy  # → 21-jre-jammy (après upgrade Java)
FROM alpine:3.21           # → 3.22 si disponible

# La CI rebuild et teste automatiquement à chaque push
```

---

## GitHub Actions

Les actions sont versionnées dans `.github/workflows/ci-cd.yml`. Mettre à jour les tags (`@v4` → `@v5`) après chaque release majeure.

Configurer Dependabot pour l'automatiser :

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
  - package-ecosystem: "npm"
    directory: "/front"
    schedule:
      interval: "weekly"
  - package-ecosystem: "gradle"
    directory: "/back"
    schedule:
      interval: "monthly"
```

---

## Gestion du lockfile Gradle

Le projet utilise `dependencyLocking`. Après chaque modification de `build.gradle` :

```bash
# Régénérer le lockfile (obligatoire avant commit)
./gradlew dependencies --write-locks

# Vérifier que le build est reproductible
./gradlew build --no-daemon
```

Ne jamais committer un `build.gradle` modifié sans régénérer le lockfile.
