# Veille technologique — MicroCRM

Ce document recense les versions utilisées dans le projet, les mises à jour identifiées, et les sources à surveiller. Il est mis à jour au fil des découvertes.

---

## GitHub Actions

### Versions en cours dans `.github/workflows/ci-cd.yml`

| Action | Version utilisée | Vérifiée le | Source |
|---|---|---|---|
| `actions/cache` | `@v5` | 2026-06-09 | [github.com/actions/cache](https://github.com/actions/cache) — utilisé en interne par `setup-java` et `setup-node`, non appelé directement |
| `actions/checkout` | `@v6` | 2026-06-09 | [github.com/actions/checkout](https://github.com/actions/checkout) |
| `actions/setup-java` | `@v5` | 2026-06-09 | [github.com/actions/setup-java](https://github.com/actions/setup-java) |
| `actions/setup-node` | `@v6` | 2026-06-09 | [github.com/actions/setup-node](https://github.com/actions/setup-node) |
| `actions/upload-artifact` | `@v7` | 2026-06-09 | [github.com/actions/upload-artifact](https://github.com/actions/upload-artifact) |
| `actions/download-artifact` | `@v8` | 2026-06-09 | [github.com/actions/download-artifact](https://github.com/actions/download-artifact) |
| `SonarSource/sonarqube-scan-action` | `@v6` | — | [github.com/SonarSource/sonarqube-scan-action](https://github.com/SonarSource/sonarqube-scan-action) |
| `docker/setup-buildx-action` | `@v4` | 2026-06-09 | [github.com/docker/setup-buildx-action](https://github.com/docker/setup-buildx-action) |
| `docker/login-action` | `@v4` | 2026-06-09 | [github.com/docker/login-action](https://github.com/docker/login-action) |
| `docker/metadata-action` | `@v6` | 2026-06-09 | [github.com/docker/metadata-action](https://github.com/docker/metadata-action) |
| `docker/build-push-action` | `@v7` | 2026-06-09 | [github.com/docker/build-push-action](https://github.com/docker/build-push-action) |
| `softprops/action-gh-release` | `@v2` | — | [github.com/softprops/action-gh-release](https://github.com/softprops/action-gh-release) |

### Mise à jour identifiée

| Action | Ancienne version | Nouvelle version | Date découverte | Appliquée |
|---|---|---|---|---|
| `actions/cache` | — | `@v5` | 2026-06-09 | N/A — dépendance indirecte |
| `actions/checkout` | `@v4` | `@v6` | 2026-06-09 | ✅ |
| `actions/setup-java` | `@v4` | `@v5` | 2026-06-09 | ✅ |
| `actions/setup-node` | `@v4` | `@v6` | 2026-06-09 | ✅ |
| `actions/upload-artifact` | `@v4` | `@v7` | 2026-06-09 | ✅ |
| `actions/download-artifact` | `@v4` | `@v8` | 2026-06-09 | ✅ |
| `docker/setup-buildx-action` | `@v3` | `@v4` | 2026-06-09 | ✅ |
| `docker/login-action` | `@v3` | `@v4` | 2026-06-09 | ✅ |
| `docker/metadata-action` | `@v5` | `@v6` | 2026-06-09 | ✅ |
| `docker/build-push-action` | `@v6` | `@v7` | 2026-06-09 | ✅ |

### Comment vérifier les nouvelles versions

Chaque action est un dépôt GitHub. Les releases sont disponibles dans l'onglet **Releases** du dépôt correspondant. Pour ne pas surveiller manuellement, il est possible de configurer **Dependabot** pour les GitHub Actions :

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

Dependabot ouvre automatiquement des pull requests quand une action a une nouvelle version majeure.

---

## Images Docker

### Versions en cours dans `Dockerfile`

| Image | Version utilisée | Rôle | EOL / Support |
|---|---|---|---|
| `node` | `20-alpine` | Build front (stage uniquement) | ⚠️ Node 20 EOL avril 2026 — voir ci-dessous |
| `gradle` | `8.7-jdk17` | Build back (stage uniquement) | Gradle 8.7 supporté |
| `caddy` | `2-alpine` | Runtime front | Tag flottant sur branche 2.x stable |
| `eclipse-temurin` | `17-jre-jammy` | Runtime back | Java 17 LTS supporté jusqu'à sept. 2029. Variante Jammy (Ubuntu 22.04) — multi-plateforme amd64 + arm64. La variante `-alpine` n'a pas de manifest ARM64. |

### Mise à jour identifiée

| Image | Ancienne version | Nouvelle version | Raison | Appliquée |
|---|---|---|---|---|
| `alpine` | `3.19` | `3.21` | Alpine 3.19 EOL nov. 2025 | ✅ |

### Point de vigilance — Node 20

Node 20 LTS a atteint sa fin de support en **avril 2026**. La prochaine version LTS active est **Node 22**.

La migration `node:20-alpine` → `node:22-alpine` est bloquée par la compatibilité Angular :

- Angular 17 supporte officiellement Node >= 18.19.1
- Node 22 est compatible, mais Angular 17 est lui-même en fin de maintenance
- **Recommandation** : migrer Angular 17 → 18 en même temps que Node 20 → 22

| Action | Dépendance | Priorité |
|---|---|---|
| `node:20-alpine` → `node:22-alpine` | Requiert test de compatibilité Angular 17 | Moyen terme |
| Angular 17 → 18 | Node 22 LTS, Angular CLI 18 | Moyen terme |

### Sources à surveiller

| Sujet | Source |
|---|---|
| Cycle de vie Node.js | [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases) |
| Cycle de vie Alpine Linux | [alpinelinux.org/releases](https://alpinelinux.org/releases/) |
| Releases Eclipse Temurin | [adoptium.net/temurin/releases](https://adoptium.net/temurin/releases/) |
| Java LTS roadmap | [endoflife.date/java](https://endoflife.date/java) |

---

## Stack applicative

### Versions en cours

| Composant | Version | Support |
|---|---|---|
| Java | 17 LTS | Supporté jusqu'à sept. 2029 ✅ |
| Spring Boot | 3.2.5 | 3.2.x fin de support — voir ci-dessous |
| Gradle | 8.7 | Maintenu |
| Angular | 17.3 | En fin de maintenance — voir ci-dessous |
| TypeScript | 5.4 | Supporté |
| Node.js | 20 LTS | EOL avril 2026 ⚠️ |

### Points de vigilance

**Spring Boot 3.2.x**

Spring Boot 3.2.x a atteint sa fin de support OSS. La branche active est **3.4.x** (ou 3.3.x selon le calendrier de release).

- Risque : pas de correctifs de sécurité sur 3.2.x
- Migration : `build.gradle` → `id 'org.springframework.boot' version '3.4.x'`
- Les releases Spring Boot suivent un cycle de 12 mois de support OSS par version mineure

**Angular 17**

Angular 17 est en maintenance (correctifs de sécurité uniquement, pas de nouvelles fonctionnalités). La version active LTS est **Angular 18** (puis 19).

- Migration : `ng update @angular/core@18 @angular/cli@18`
- Vérifier la compatibilité des dépendances (`rxjs`, `zone.js`, etc.)

### Sources à surveiller

| Sujet | Source |
|---|---|
| Spring Boot releases | [spring.io/projects/spring-boot#support](https://spring.io/projects/spring-boot#support) |
| Angular releases | [angular.dev/reference/releases](https://angular.dev/reference/releases) |
| Gradle releases | [gradle.org/releases](https://gradle.org/releases/) |

---

## Processus de veille recommandé

| Fréquence | Action |
|---|---|
| À chaque commit | Dependabot signale automatiquement les mises à jour d'actions GitHub si configuré |
| Mensuel | Vérifier les versions des images Docker de base (Alpine, Temurin, Node, Caddy) |
| Trimestriel | Vérifier l'état du support Spring Boot et Angular (EOL ?) |
| Annuel | Évaluer une montée de version Java LTS (17 → 21 → 25) |
