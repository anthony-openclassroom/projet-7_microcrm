# Monitoring — Stack ELK

**Date d'intégration :** 09 juin 2026

---

## Architecture

```
Spring Boot ──TCP:5000──► Logstash ──► Elasticsearch :9200
Caddy ──JSON file──► Volume ──► Filebeat ──Beats:5044──► Logstash
                                                       Kibana :5601
```

Deux sources de logs :
- **Spring Boot** → format JSON via `LogstashTcpSocketAppender` (port TCP 5000)
- **Caddy** → access logs JSON dans un fichier → collecté par Filebeat

---

## Composants

| Composant | Image | Version | Rôle |
|---|---|---|---|
| Elasticsearch | `docker.elastic.co/elasticsearch/elasticsearch` | 8.13.4 | Stockage et indexation |
| Logstash | `docker.elastic.co/logstash/logstash` | 8.13.4 | Ingestion, transformation, routage |
| Kibana | `docker.elastic.co/kibana/kibana` | 8.13.4 | Visualisation |
| Filebeat | `docker.elastic.co/beats/filebeat` | 8.13.4 | Collecte logs Caddy |

> Les 4 composants doivent être sur la même version — les protocoles internes Elastic ne sont pas rétrocompatibles entre mineures.

---

## Démarrage

```bash
# Stack complète : app + ELK
docker compose -f docker-compose.yml -f docker-compose.elk.yml up --build

# App seule (sans ELK)
docker compose up --build
```

Kibana : http://localhost:5601

Ressources nécessaires : ~2 Go RAM supplémentaires (512 Mo JVM Elasticsearch, 256 Mo Logstash).

---

## Première connexion Kibana

1. Ouvrir http://localhost:5601
2. `Stack Management` → `Data Views` → `Create data view`
3. Index pattern : `microcrm-*`
4. Timestamp field : `@timestamp`
5. Sauvegarder

---

## Index créés

| Index | Source | Contenu |
|---|---|---|
| `microcrm-spring-boot-YYYY.MM.dd` | Spring Boot via TCP | Logs applicatifs (level, logger, message, stack traces) |
| `microcrm-caddy-YYYY.MM.dd` | Filebeat via fichier | Access logs HTTP (méthode, URL, status, durée) |

---

## Indicateurs clés (KPI ELK)

| Indicateur | Source | Seuil d'alerte |
|---|---|---|
| Volume logs / minute | `microcrm-spring-boot-*` — date histogram `@timestamp` | > 2× baseline |
| Taux erreurs applicatives | Filtre `log_level: ERROR` / total | > 5 % |
| Status HTTP 5xx Caddy | `microcrm-caddy-*` — terms `status` | > 0 sur 10 min |
| Temps de réponse moyen | Avg aggregation champ `duration` | > 2 s |

Visualisations recommandées dans un Dashboard :

| Visualisation | Type | Champ |
|---|---|---|
| Volume de logs / minute | Bar chart | `@timestamp` (date histogram) |
| Distribution ERROR/WARN/INFO | Pie chart | `log_level` |
| Table des erreurs récentes | Data table | `log_level: ERROR` + `message` |
| Status HTTP Caddy | Bar chart | `status` (terms) |
| Top loggers | Bar chart | `logger` (terms) |

---

## Points de vigilance

| Point | Détail |
|---|---|
| Sécurité X-Pack | `xpack.security.enabled=false` — usage local **uniquement**. Jamais en production. |
| Filebeat en root | Nécessaire pour lire les fichiers log de Caddy (uid différent). Exception documentée. |
| ELK hors CI/CD | `docker-compose.elk.yml` n'est pas inclus dans le pipeline GitHub Actions. |
| Persistance des logs | Le volume `elasticsearch-data` est nommé — persiste entre `down`/`up`. Un `down -v` supprime tout. |

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `docker-compose.elk.yml` | Services Elasticsearch, Logstash, Kibana, Filebeat |
| `misc/elk/logstash/pipeline/logstash.conf` | Pipeline : 2 inputs, filtre, sortie Elasticsearch |
| `misc/elk/filebeat/filebeat.yml` | Surveillance fichier log Caddy → Logstash |
| `back/src/main/resources/logback-spring.xml` | Config Logback : profil `docker` → TCP Logstash |
