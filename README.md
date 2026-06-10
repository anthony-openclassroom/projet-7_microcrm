<p align="center">
   <img src="./front/src/favicon.png" width="192px" />
</p>

# MicroCRM

MicroCRM est une implémentation simplifiée d'un [CRM (Customer Relationship Management)](https://fr.wikipedia.org/wiki/Gestion_de_la_relation_client). Les fonctionnalités couvrent la création, l'édition et la visualisation des individus liés à des organisations.

Projet 6 — Développeur Full-Stack Java et Angular — _Mettre en œuvre l'intégration et le déploiement continu d'une application Full-Stack_.

![Page d'accueil](./misc/screenshots/screenshot_1.png)
![Édition de la fiche d'un individu](./misc/screenshots/screenshot_2.png)

---

## Code source

Ce [monorepo](https://en.wikipedia.org/wiki/Monorepo) contient deux composantes :

- `back/` — backend Java Spring Boot 3
- `front/` — frontend Angular 17

### Lancer en local

#### Backend

**Prérequis :** [OpenJDK >= 17](https://openjdk.org/)

```shell
cd back
./gradlew build
java -jar build/libs/microcrm-0.0.1-SNAPSHOT.jar
```

API disponible sur http://localhost:8080.

#### Frontend

**Prérequis :** [npm >= 10](https://www.npmjs.com/)

```shell
cd front
npm install
npx @angular/cli serve
```

Application disponible sur http://localhost:4200.

### Tests

#### Backend

```shell
cd back
./gradlew test
```

#### Frontend

**Prérequis :** Google Chrome ou Chromium

```shell
cd front
CHROME_BIN=/path/to/chrome npm test
# En mode headless (CI)
npm test -- --no-watch --browsers=ChromeHeadlessNoSandbox
```

---

## Docker

### Avec Docker Compose (recommandé)

```shell
docker compose up --build
```

Frontend sur http://localhost, API sur http://localhost:8080.

### Images individuelles

#### Frontend

```shell
docker build --target front -t orion-microcrm-front:latest .
docker run -it --rm -p 80:80 -p 443:443 orion-microcrm-front:latest
```

Application disponible sur https://localhost.

#### Backend

```shell
docker build --target back -t orion-microcrm-back:latest .
docker run -it --rm -p 8080:8080 orion-microcrm-back:latest
```

API disponible sur http://localhost:8080.

---

## CI/CD

Le pipeline est configuré dans [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

À chaque push ou pull request vers `main` :

1. Build et tests backend (Gradle)
2. Build, tests et audit frontend (npm)
3. Analyse qualité SonarCloud

Sur push vers `main` uniquement :

4. Build et publication des images Docker (GHCR — GitHub Container Registry)
5. Création d'une release GitHub sur tag `v*`

Pour créer une release :

```shell
git tag v1.0.0 && git push origin v1.0.0
```

### Documentation détaillée

| Document | Contenu |
|---|---|
| [`docs/deploy.md`](docs/deploy.md) | Pipeline CD — commandes, secrets, démarrage rapide opérateur |
| [`docs/plan-tests.md`](docs/plan-tests.md) | Plan de tests — inventaire, couverture 91.5 %, notes techniques |
| [`docs/plan-securite.md`](docs/plan-securite.md) | Plan de sécurité — vulnérabilités OWASP, risques, actions P0→P3 |
| [`docs/monitoring-elk.md`](docs/monitoring-elk.md) | Stack ELK — architecture, démarrage, indicateurs Kibana |
| [`docs/plan-sauvegarde.md`](docs/plan-sauvegarde.md) | Plan de sauvegarde — ce qui est sauvegardé, procédures de restauration |
| [`docs/plan-mise-a-jour.md`](docs/plan-mise-a-jour.md) | Plan de mise à jour — Gradle, npm, Angular, Docker, Dependabot |
| [`docs/metriques-dora-kpi.md`](docs/metriques-dora-kpi.md) | Métriques DORA et KPI pipeline — Lead Time ~7 min Elite |
| [`docs/synthese-amelioration-continue.md`](docs/synthese-amelioration-continue.md) | Synthèse globale — roadmap 10 actions, quick wins, bilan |
| [`docs/veilleinfo.md`](docs/veilleinfo.md) | Veille technologique — versions, état du support, EOL |
