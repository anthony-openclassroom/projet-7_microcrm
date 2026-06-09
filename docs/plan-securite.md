# Plan de sécurité — MicroCRM

**Date :** 09 juin 2026 | **Sources :** SonarCloud, analyse statique, npm audit, OWASP Top 10 2021

> **Distinction importante :** une **vulnérabilité** peut être exploitée (OWASP). Un **code smell** dégrade la maintenabilité sans impact sécurité direct. Les deux sont tracés ici avec leur catégorie.

---

## Inventaire des problèmes

### Back-end

| # | Fichier | Problème | Type | Criticité | OWASP 2021 | Statut |
|---|---|---|---|---|---|---|
| B1 | `SpringDataRestCustomization.java:14` | `allowedOrigins("*")` — toute origine acceptée | Vulnérabilité | 🔴 Critique | A05 Security Misconfiguration | En cours |
| B2 | `PersonRepository`, `OrganizationRepository` | `@CrossOrigin` redondant avec la config globale | Code Smell | 🟡 Modéré | A05 | En cours |
| B3 | API entière | Aucune auth — CREATE/UPDATE/DELETE ouverts à tous | Vulnérabilité | 🔴 Critique | A01 Broken Access Control | Hors scope v1 |
| B4 | `Person.java`, `Organization.java` | Aucune validation Bean (`@NotNull`, `@Email`) | Vulnérabilité | 🟠 Élevé | A03 / A04 | En cours |
| B5 | `SpringDataRestCustomization.java:13` | IDs internes exposés dans l'API | Security Hotspot | 🟡 Modéré | A01 | Accepté |
| B6 | `Person.java:3` | `java.util.Date` déprécié depuis Java 8 | Code Smell | 🟢 Faible | — | À planifier |
| B7 | Tests | Couverture ~16 % initialement | Qualité | 🟠 Élevé | A04 | ✅ Corrigé — 91.5 % |

### Front-end

| # | Fichier | Problème | Type | Criticité | OWASP 2021 | Statut |
|---|---|---|---|---|---|---|
| F1 | `config.ts:1` | `API_BASE_URL = "http://localhost:8080"` hardcodée | Vulnérabilité | 🟠 Élevé | A05 | En cours |
| F2 | Services | Aucune gestion d'erreur HTTP — rejets silencieux | Code Smell | 🟡 Modéré | A09 Logging Failures | En cours |
| F3 | Services | Cast `as any` — contournement du typage TypeScript | Code Smell | 🟡 Modéré | A04 | En cours |
| F4 | `organization-details.component.html:32` | Label sans `for` | Code Smell | 🟡 Modéré | — | ✅ Corrigé |
| F5 | `organization-details.component.ts:36` | `parseInt` global | Code Smell | 🟢 Faible | — | ✅ Corrigé |
| F6 | `person-details.component.ts:33` | Async dans constructeur | Code Smell | 🟠 Élevé (Reliability) | A04 | ✅ Corrigé |
| F7 | `person-details.component.ts:43` | `parseInt` global | Code Smell | 🟢 Faible | — | ✅ Corrigé |
| F8 | `@angular/core ≤18.2.14` | 29 vulnérabilités HIGH npm (XSS via i18n/SVG) | Vulnérabilité | 🟠 Élevé | A03 XSS | Tracé — Angular 21 requis |

### Infrastructure

| # | Élément | Problème | Statut |
|---|---|---|---|
| I1 | Dockerfile | Conteneurs en `root` | ✅ Corrigé |
| I2 | Images Docker | Versions non épinglées (`FROM node`) | ✅ Corrigé |
| I3 | `eclipse-temurin:17-jre-alpine` | Incompatibilité ARM64 | ✅ Corrigé |
| I4 | `alpine:3.19` | Version EOL nov. 2025 | ✅ Corrigé |
| I5 | `docker-compose.elk.yml` | `xpack.security.enabled=false` — usage local uniquement | Documenté |

---

## Duplications de code (SonarCloud)

| Pattern dupliqué | Occurrences | Impact |
|---|---|---|
| `fetchById` + appel relations | 2 × | Double maintenance |
| `fetchAll` + extraction `_embedded` | 2 × | Couplage implicite HATEOAS |
| `save` (POST si nouveau, PUT si existant) | 2 × | Logique répétée |
| `firstValueFrom(response)` | 10+ appels | Pas d'abstraction commune |

Refactoring proposé : un helper `AbstractRestService<T>` réduirait la duplication de ~40 %.

---

## Tableau des risques

**C = Fréquence (F) × Gravité (G)** | 🟢 1–4 | 🟡 5–8 | 🟠 9–12 | 🔴 13–16

| Risque | F | G | C | Niveau | Statut |
|---|:---:|:---:|:---:|---|---|
| API sans authentification | 4 | 4 | **16** | 🔴 Critique | Hors scope v1 — bloquant avant prod |
| CORS `allowedOrigins("*")` | 3 | 3 | **9** | 🟠 Élevé | En cours |
| Aucune validation des champs API | 3 | 3 | **9** | 🟠 Élevé | En cours |
| `API_BASE_URL` hardcodée | 3 | 2 | **6** | 🟡 Modéré | En cours |
| Vulnérabilités Angular XSS | 2 | 3 | **6** | 🟡 Modéré | Tracé — Angular 21 |
| Quality Gate non bloquant | 2 | 2 | **4** | 🟢 Faible | En cours |
| `@CrossOrigin` redondant | 2 | 2 | **4** | 🟢 Faible | En cours |
| Conteneurs en `root` | 3 | 3 | **9** | 🟠 Élevé | ✅ Corrigé |
| Images Docker non épinglées | 4 | 2 | **8** | 🟡 Modéré | ✅ Corrigé |

---

## Plan d'action priorisé

| Priorité | Action | Effort | Impact |
|---|---|---|---|
| **P0 — Avant prod** | Ajouter Spring Security (auth + authz) | Élevé | 🔴 Critique |
| **P1 — Court terme** | Restreindre CORS : remplacer `*` par l'URL du front | Faible | 🟠 Élevé |
| **P1 — Court terme** | Ajouter Bean Validation (`@NotNull`, `@Size`, `@Email`) | Faible | 🟠 Élevé |
| **P1 — Court terme** | Externaliser `API_BASE_URL` → `environment.ts` | Faible | 🟡 Modéré |
| **P2 — Moyen terme** | Gestion d'erreur HTTP dans les services Angular | Modéré | 🟡 Modéré |
| **P2 — Moyen terme** | Supprimer `@CrossOrigin` redondant sur les repositories | Faible | 🟢 Faible |
| **P2 — Moyen terme** | Activer Quality Gate SonarCloud bloquant | Faible | Qualité |
| ✅ **P2 — Fait** | Tests comportementaux — couverture 91.5 % back+front | — | Qualité |
| **P3 — Long terme** | Migrer Angular 17 → 18+ (29 CVE HIGH npm) | Élevé | 🟡 Modéré |
| **P3 — Long terme** | Remplacer `java.util.Date` par `LocalDateTime` | Modéré | Maintenabilité |
| **P3 — Long terme** | Factoriser services Angular (réduire duplication ~40 %) | Modéré | Maintenabilité |

---

## Règles SonarSource déclenchées

| Règle | Langage | Sévérité | Occurrence |
|---|---|---|---|
| `java:S5122` — CORS trop permissif | Java | Critical | `SpringDataRestCustomization.java` |
| `typescript:S2486` — Promise rejetée non gérée | TypeScript | Major | Tous les services Angular |
| `typescript:S4325` — Cast `as any` inutile | TypeScript | Minor | Services Angular |

---

## Gestion des secrets

| Secret | Stockage | Visibilité |
|---|---|---|
| `SONAR_TOKEN` | GitHub Secrets (Settings → Secrets → Actions) | Masqué dans les logs CI |
| `GITHUB_TOKEN` | Automatique — injecté par GitHub Actions | Masqué dans les logs CI |

Aucune credential dans les images Docker, les fichiers committés, ou `application.properties`.
