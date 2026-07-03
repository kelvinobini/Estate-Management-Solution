# Deployment (Deliverable 12–13)

## Local development (Docker Compose)

```bash
# 1. Generate a throwaway dev JWT keypair + MFA key into apps/api/.env
node scripts/generate-dev-secrets.js

# 2. Start Postgres, Redis, and the API
docker compose up --build

# 3. In another terminal, seed RBAC + a demo org/admin (see docs/README in apps/api)
cd apps/api && npm run db:seed
```

The Postgres container applies `db/schema.sql` automatically on its **first**
start only (the official Postgres image's `/docker-entrypoint-initdb.d/`
convention — it does not re-run on restarts). To re-apply from scratch:

```bash
docker compose down -v   # drops the postgres_data volume
docker compose up --build
```

The API is then reachable at `http://localhost:3000`, with
`GET /health/live` and `GET /health/ready` for a quick check.

**Caveat**: Docker wasn't available in the environment this project was
built in, so `docker-compose.yml` and the `Dockerfile` were written and
YAML/syntax-checked carefully but never actually run end-to-end locally.
The GitHub Actions workflow's `docker-build` job (see below) is the first
real build of the image — treat its result as the actual verification.

## CI (`.github/workflows/ci.yml`)

Two jobs, both required on every push/PR:

- **test**: `npm ci`, lint, typecheck, `jest --coverage`, `nest build` — all against `apps/api`.
- **docker-build**: builds the Dockerfile (no push). This is the only place the image is actually built, given Docker's unavailability locally during development.

## Production (Kubernetes)

Manifests live in `k8s/`. Apply order:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
# Copy k8s/secret.example.yaml -> k8s/secret.yaml, fill in real values, then:
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```

**Postgres and Redis are deliberately not run in-cluster.** `DATABASE_URL`/
`REDIS_URL` in `secret.yaml` should point at managed services (RDS/Cloud SQL,
ElastiCache/Memorystore, or equivalent) — running your primary transactional
database as a Kubernetes StatefulSet is extra operational burden this
project's "budget-conscious infrastructure" requirement doesn't call for.

Schema application in production is a manual/DBA-run step for now
(`psql $DATABASE_URL -f db/schema.sql` against a fresh database) — there's no
migration tool wired in yet (see Known Gaps below).

### What's in each manifest

| File | Purpose |
|---|---|
| `namespace.yaml` | Isolates all EstateCore resources under the `estatecore` namespace |
| `configmap.yaml` | Non-secret env vars (`NODE_ENV`, `PORT`, `JWT_ISSUER`, etc.) |
| `secret.example.yaml` | Template for `DATABASE_URL`, `REDIS_URL`, JWT keys, Paystack keys — **copy, fill in, never commit the filled version** |
| `deployment.yaml` | 2 replicas by default, readiness probe on `/health/ready` (DB reachability), liveness probe on `/health/live` (process alive, no dependency checks) |
| `service.yaml` | ClusterIP in front of the deployment |
| `hpa.yaml` | Scales 2→6 replicas on CPU utilization (requires `metrics-server`) |
| `ingress.yaml` | nginx-ingress + cert-manager TLS — adjust `ingressClassName`/annotations for your cluster's actual ingress controller |

## Known gaps (deliberately not built yet)

- **No migration tool.** `db/schema.sql` is applied directly (via Postgres's init-script convention in Compose, manually in production). A real migration tool (node-pg-migrate, Kysely's own migrator, etc.) would be the next step before this handles schema changes safely post-launch.
- **No image registry / CD step.** CI builds the Docker image but doesn't push it anywhere or deploy it — wiring that up (GHCR/ECR push + `kubectl set image` or a GitOps tool like Argo CD) is a reasonable next increment once there's an actual cluster to target.
- **Health checks are DB-only.** Redis, BullMQ queue health, and the Paystack integration aren't checked by `/health/ready` — a Redis outage would degrade queues/refresh-tokens without showing up as "not ready."
