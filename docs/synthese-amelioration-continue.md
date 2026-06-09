# Synthèse et amélioration continue — MicroCRM

**Date :** 09 juin 2026

---

## Bilan global

| Indicateur | Valeur | Commentaire |
|---|---|---|
| Lead Time CI/CD | ~7 min | Elite DORA |
| Deployment Frequency | 3 releases / 3 jours | Elite DORA |
| MTTR | ~10–15 min | Elite DORA |
| Change Failure Rate | ~27 % | Phase init — cible < 15 % |
| Couverture back | 91.5 % lignes | Dépasse la cible (60 %) |
| Couverture front | 91.5 % lignes | Dépasse la cible (40 %) |
| Issues Reliability SonarCloud | 0 restantes | −4 depuis le début |
| Vulnérabilités npm HIGH | 29 | Bloquées sur Angular ≤18 |
| Infrastructure Docker | Sécurisée | Non-root, images épinglées, EOL corrigé |

---

## Roadmap d'amélioration

| # | Action | Justification | Effort | Priorité |
|---|---|---|---|---|
| 1 | Ajouter Spring Security (auth + authz) | API totalement ouverte — OWASP A01 Critique. Bloquant avant prod. | Élevé | 🔴 P0 |
| 2 | Restreindre CORS (`allowedOrigins("*")`) | OWASP A05 — correction en une ligne. | Faible | 🟠 P1 |
| 3 | Ajouter Bean Validation (`@NotNull`, `@Email`) | OWASP A03 — sans validation, requête malformée passe. | Faible | 🟠 P1 |
| 4 | Externaliser `API_BASE_URL` → `environment.ts` | `localhost:8080` hardcodé empêche tout déploiement réel. | Faible | 🟠 P1 |
| 5 | Activer Quality Gate SonarCloud bloquant | `continue-on-error: true` neutralise la gate. | Faible | 🟡 P2 |
| 6 | Gestion d'erreur HTTP dans les services Angular | Rejets silencieux — OWASP A09, impact UX. | Modéré | 🟡 P2 |
| 7 | Supprimer `@CrossOrigin` redondant | Doublon avec config globale — source de confusion. | Faible | 🟢 P3 |
| 8 | Migrer Angular 17 → 18+ | 29 CVE HIGH npm. Seul correctif disponible. | Élevé | 🟢 P3 |
| 9 | Migrer Spring Boot 3.2.x → 3.4.x | 3.2.x fin de support OSS — pas de patchs sécu. | Modéré | 🟢 P3 |
| 10 | Factoriser services Angular (AbstractRestService) | Duplication ~40 % entre PersonService / OrganizationService. | Modéré | 🟢 P3 |

---

## Quick wins (faible effort, impact immédiat)

Ces 3 actions sont P1 et se corrigent en moins d'une heure :

**1. Restreindre CORS** — `SpringDataRestCustomization.java:14`
```java
// Avant
.allowedOrigins("*")

// Après (remplacer par l'URL réelle du front en prod)
.allowedOrigins("http://localhost", "https://microcrm.example.com")
```

**2. Supprimer `@CrossOrigin` redondant** — `PersonRepository.java`, `OrganizationRepository.java`
```java
// Supprimer les annotations @CrossOrigin sur les repositories
// La config globale dans SpringDataRestCustomization suffit
```

**3. Externaliser l'URL API** — `front/src/environments/environment.ts`
```typescript
// Créer front/src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080'
};

// Modifier config.ts
import { environment } from '../environments/environment';
export const API_BASE_URL = environment.apiBaseUrl;
```

---

## Ce qui est déjà fait (résumé)

| Catégorie | Actions réalisées |
|---|---|
| Infrastructure Docker | Non-root, images épinglées, ARM64 fix, Alpine EOL corrigé |
| Qualité SonarCloud | 4 Reliability issues résolues, npm audit fix (33 vulnérabilités) |
| Tests | 26 tests back (91.5 %), 34 tests front (91.5 %) |
| Bug `@PreRemove` | NPE sur suppression personne sans organisations — corrigé |
| Monitoring | Stack ELK fonctionnelle — Spring Boot + Caddy → Kibana |
| Pipeline | CI/CD complet — back + front + Sonar + Docker + Release |
| Versioning | SemVer + GitHub Releases + GHCR |

---

## Documents de référence

| Document | Contenu |
|---|---|
| [plan-tests.md](plan-tests.md) | Inventaire et couverture des tests |
| [plan-securite.md](plan-securite.md) | Vulnérabilités, risques, plan d'action |
| [monitoring-elk.md](monitoring-elk.md) | Stack ELK — démarrage et indicateurs |
| [plan-sauvegarde.md](plan-sauvegarde.md) | Ce qui est sauvegardé et comment restaurer |
| [plan-mise-a-jour.md](plan-mise-a-jour.md) | Procédure de mise à jour des dépendances |
| [metriques-dora-kpi.md](metriques-dora-kpi.md) | Métriques DORA et KPI pipeline |
| [deploy.md](deploy.md) | Pipeline CD détaillé — commandes et secrets |
| [veilleinfo.md](veilleinfo.md) | Versions et état du support des dépendances |
