# Plan de tests — MicroCRM

**Couverture atteinte :** 91.5 % lignes back-end (JaCoCo) · 91.5 % lignes front-end (Karma)

---

## Commandes

```bash
# Back-end — compile + tests + rapport JaCoCo
cd back && ./gradlew test
# Rapport HTML : back/build/reports/tests/test/index.html
# Couverture  : back/build/reports/jacoco/test/html/index.html

# Front-end — tests headless + couverture Istanbul
cd front && npm test -- --no-watch --browsers=ChromeHeadlessNoSandbox --code-coverage
# Rapport HTML : front/coverage/index.html
```

---

## Inventaire des tests

### Back-end (26 tests)

| Classe | Type | Ce qui est testé |
|---|---|---|
| `MicroCRMApplicationTests` | `@SpringBootTest` | Contexte Spring démarre sans erreur |
| `PersonRepositoryIntegrationTest` | `@DataJpaTest` | `findByEmail` via HSQLDB in-memory |
| `PersonTest` | Unitaire JUnit 5 | Constructeurs, getters/setters de `Person` |
| `OrganizationTest` | Unitaire JUnit 5 | `addPerson` (liste null/non-null), `removePerson`, `setPersons` |
| `PersonRestIntegrationTest` | `@SpringBootTest + @AutoConfigureMockMvc + @Transactional` | GET list, POST 201+Location, GET by id, 404, PATCH+vérif, DELETE+404, search email, pagination |
| `OrganizationRestIntegrationTest` | `@SpringBootTest + @AutoConfigureMockMvc + @Transactional` | GET list, POST, GET by id, 404, PATCH+vérif, DELETE, pagination |

### Front-end (34 tests)

| Fichier | Ce qui est testé |
|---|---|
| `app.component.spec.ts` | Création, titre, rendu H1 |
| `person.service.spec.ts` | `fetchAll`, `fetchById`, `fetchPersonOrganizations`, `save` POST/PUT, `deleteById` |
| `organization.service.spec.ts` | `fetchAll`, `fetchById`, `fetchOrganizationPersons`, `save` POST/PUT, `deleteById`, `addPerson`, `removePerson` |
| `main-dashboard.component.spec.ts` | Init charge persons + organizations, appel des services |
| `person-details.component.spec.ts` | Mode new (isNew=true, nav post-save), mode edit (fetchById, delete, save sans nav) |
| `organization-details.component.spec.ts` | Mode new, mode edit (fetchById, delete, save sans nav) |

---

## Couverture

| Couche | Lignes | Branches | Méthodes | Cible | Statut |
|---|---|---|---|---|---|
| Back-end | **91.5 %** | 60 % | 97 % | 60 % | ✅ |
| Front-end | **91.5 %** | 57 % | 89 % | 40 % | ✅ |

La couverture branches plus basse (57-60 %) correspond aux cas d'erreur HTTP et gardes null délibérément hors scope — voir [plan-securite.md](plan-securite.md) section P2.

---

## Déclencheurs CI

| Événement | Tests exécutés |
|---|---|
| Push vers `main` | Back + front + SonarCloud + Docker |
| Pull request vers `main` | Back + front + SonarCloud uniquement |

---

## Choix techniques

**Spring Data REST** ne génère pas de `@RestController` — les endpoints REST sont produits par le framework. La couverture de ces endpoints nécessite `@SpringBootTest + @AutoConfigureMockMvc` (test d'intégration complet) plutôt que des mocks de controller. `@Transactional` sur chaque test classe garantit le rollback des données après chaque test.

**Services Angular** testés avec `HttpClient` spy + `of()` RxJS plutôt que `HttpClientTestingModule`. Raison : le pattern `await observable` avant `firstValueFrom()` crée un yield de microtask — `HttpTestingController.expectOne()` est appelé avant que la souscription HTTP soit effective. Le spy + `of()` contourne ce timing et teste l'interface (méthode, URL, payload) de façon fiable.
