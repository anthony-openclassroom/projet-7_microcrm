# Métriques DORA et KPI — MicroCRM

**Période :** 07–09 juin 2026 | **Releases analysées :** v1.0.0, v1.0.1, v1.1.0

---

## Les 4 métriques DORA

| Métrique | Définition retenue | Valeur mesurée | Classe DORA |
|---|---|---|---|
| **Lead Time for Changes** | Durée entre le dernier commit et la fin du job `docker` (image disponible sur GHCR) | ~7 min | **Elite** (< 1h) |
| **Deployment Frequency** | Releases GHCR réussies par jour | 3 releases / 3 jours | **Elite** (> 1/jour) |
| **MTTR** | Durée entre le commit cassant et le commit de correction | ~10–15 min | **Elite** (< 1h) |
| **Change Failure Rate** | (Runs nécessitant un fix correctif / total runs main) × 100 | ~27 % | **Low** (> 15 %) |

> **Note CFR :** les 4 incidents correctifs concernent exclusivement la configuration CI/CD (phase d'initialisation de zéro — clé Sonar, chemin d'artefact, seuil npm audit). Le code applicatif n'a jamais causé d'échec. Cible stabilisée : < 15 %.

---

## KPI opérationnels du pipeline

| KPI | Valeur | Source |
|---|---|---|
| Build backend (Gradle compile + tests + JaCoCo) | ~55 s | GitHub Actions — job `backend` |
| Build frontend (npm ci + Karma + ng build + audit) | ~52 s | GitHub Actions — job `frontend` |
| Analyse SonarCloud | ~52 s | GitHub Actions — job `sonar` |
| Build + push images Docker (back + front) | ~3 min | GitHub Actions — job `docker` |
| Lead Time total CI/CD | ~6–8 min | Somme des jobs en séquence critique |
| Couverture back-end (JaCoCo) | **91.5 %** lignes | `back/build/reports/jacoco/` |
| Couverture front-end (Karma) | **91.5 %** lignes | `front/coverage/` |
| Issues Reliability résolues (SonarCloud) | 4 | SonarCloud — 09/06/2026 |
| Vulnérabilités npm HIGH restantes | 29 | `npm audit` — Angular ≤18, correctif = migration Angular |
| Vulnérabilités npm corrigées (non-breaking) | 33 | `npm audit fix` — 79 → 46 |

---

## Indicateurs ELK (applicatifs)

Ces indicateurs mesurent ce qui se passe **dans l'application** une fois déployée, en complément des métriques DORA qui mesurent le pipeline.

| Indicateur | Source Kibana | Utilité |
|---|---|---|
| Volume logs / minute | `microcrm-spring-boot-*` — date histogram `@timestamp` | Détecter les pics d'activité anormaux |
| Taux d'erreurs applicatives | Filtre `log_level: ERROR` / total | Mesurer la stabilité en conditions réelles |
| Distribution INFO/WARN/ERROR | Terms aggregation `log_level` | Tableau de bord de santé applicative |
| Status HTTP Caddy (2xx/4xx/5xx) | `microcrm-caddy-*` — terms `status` | Détecter erreurs front (404 routes, 5xx back) |
| Temps de réponse moyen | Avg aggregation champ `duration` (logs Caddy) | Performance perçue par l'utilisateur |

**Baselines :** à établir après 48 h d'utilisation en conditions normales.

---

## Méthode de calcul DORA

| Métrique | Source de données |
|---|---|
| Lead Time | GitHub Actions — durée cumulée des jobs (backend + sonar + docker) |
| Deployment Frequency | GitHub Actions — runs `push main` avec job `docker` vert |
| MTTR | `git log` — paires commit cassant / commit `fix` |
| Change Failure Rate | `git log` — commits `fix(ci)` ou `fix(docker)` correctifs / total runs estimés |
