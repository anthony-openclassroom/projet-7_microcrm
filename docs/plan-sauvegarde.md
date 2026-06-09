# Plan de sauvegarde — MicroCRM

---

## Ce qui est sauvegardé

| Donnée | Mécanisme | Fréquence | Rétention |
|---|---|---|---|
| Code source | Git — GitHub (dépôt distant) | À chaque `git push` | Indéfinie |
| JAR back-end | GitHub Releases — asset téléchargeable | À chaque tag `v*` | Indéfinie |
| Archive front-end | GitHub Releases — zip `dist/` Angular | À chaque tag `v*` | Indéfinie |
| Images Docker | GHCR — tags `latest`, SHA du commit, `vX.Y.Z` | À chaque push `main` | Jusqu'à suppression manuelle |
| Configuration CI/CD | `.github/workflows/ci-cd.yml` versionné dans Git | À chaque commit | Indéfinie |
| Configuration Logback | `back/src/main/resources/logback-spring.xml` dans Git | À chaque commit | Indéfinie |
| Configuration ELK | `misc/elk/` dans Git | À chaque commit | Indéfinie |

---

## Ce qui n'est PAS sauvegardé

| Élément | Raison | Conséquence en cas de perte |
|---|---|---|
| Données HSQLDB | Base in-memory — pas de persistance entre redémarrages. Recréée par `InitialDataFixture` au démarrage. | Perte des données de démo — non critique pour ce projet. En prod : remplacer par PostgreSQL + backup DB. |
| Logs ELK indexés | Volume `elasticsearch-data` Docker nommé. Supprimé par `docker compose down -v`. | Perte des logs historiques. Non critique pour un environnement de démo. |
| Secrets (`SONAR_TOKEN`) | Gérés dans GitHub Settings → Secrets. Non versionnés. | Régénérer un token SonarCloud depuis l'interface — opération de 2 minutes. |

---

## Restauration

### Depuis une image GHCR (rollback applicatif)

```bash
# Lister les images disponibles
# → GitHub → Packages → orion-microcrm-back / orion-microcrm-front

# Modifier docker-compose.yml pour pointer sur un SHA spécifique
# image: ghcr.io/anthony-openclassroom/orion-microcrm-back:<sha>

docker compose down
docker compose pull
docker compose up -d
```

### Depuis une GitHub Release (déploiement sans Docker)

```bash
# Télécharger le JAR depuis GitHub Releases
java -jar microcrm-0.0.1-SNAPSHOT.jar   # back sur :8080

# Déployer la dist Angular sur un hébergeur statique
unzip microcrm-front-v1.0.0.zip
# Servir le contenu avec Caddy, Nginx, ou n'importe quel serveur statique
```

### Depuis les sources (rebuild complet)

```bash
git clone https://github.com/<owner>/microcrm.git
cd microcrm
docker compose up --build
```

---

## Justification par les métriques DORA

Le **MTTR mesuré est ~10-15 min** (classe Elite). La restauration est rapide car :
- Les images sont disponibles sur GHCR avec des tags SHA précis
- Le Lead Time pour reconstruire depuis les sources est ~7 min (pipeline)
- HSQLDB in-memory : aucune migration de base de données à gérer
