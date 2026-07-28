.PHONY: help dev build test lint type-check docker-up docker-down \
        db-migrate db-seed backup restore health k8s-apply k8s-delete \
        logs clean install

# ── Defaults ──────────────────────────────────────────────────────────────────
COMPOSE       := docker compose
COMPOSE_PROD  := docker compose -f docker-compose.prod.yml
BACKEND_DIR   := backend
FRONTEND_DIR  := frontend

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── Development ───────────────────────────────────────────────────────────────
install: ## Install all npm dependencies
	cd $(BACKEND_DIR)  && npm ci
	cd $(FRONTEND_DIR) && npm ci

dev: ## Start dev servers (postgres + redis + API + frontend)
	$(COMPOSE) up -d postgres redis
	npm run dev

# ── Building ──────────────────────────────────────────────────────────────────
build: ## Build backend (TypeScript → dist/) and frontend (Vite)
	cd $(BACKEND_DIR)  && npm run build
	cd $(FRONTEND_DIR) && npm run build

type-check: ## Run TypeScript type checks (no emit)
	cd $(BACKEND_DIR)  && npm run type-check
	cd $(FRONTEND_DIR) && npx tsc --noEmit

lint: ## Lint frontend with oxlint
	cd $(FRONTEND_DIR) && npx oxlint .

# ── Testing ───────────────────────────────────────────────────────────────────
test: ## Run backend unit tests
	cd $(BACKEND_DIR) && npm test

test-cover: ## Run backend tests with coverage report
	cd $(BACKEND_DIR) && npm run test:coverage

# ── Database ──────────────────────────────────────────────────────────────────
db-migrate: ## Run Prisma migrations (dev)
	cd $(BACKEND_DIR) && npm run db:migrate

db-migrate-prod: ## Apply pending migrations (production, no prompt)
	cd $(BACKEND_DIR) && npm run db:migrate:prod

db-generate: ## Regenerate Prisma client
	cd $(BACKEND_DIR) && npm run db:generate

db-seed: ## Seed database with initial data
	cd $(BACKEND_DIR) && npm run db:seed

db-studio: ## Open Prisma Studio
	cd $(BACKEND_DIR) && npm run db:studio

# ── Docker ────────────────────────────────────────────────────────────────────
docker-up: ## Start full dev stack via Docker Compose
	$(COMPOSE) up -d

docker-down: ## Stop all dev containers
	$(COMPOSE) down

docker-build: ## Build production Docker images
	$(COMPOSE_PROD) build

docker-prod-up: ## Start production stack
	$(COMPOSE_PROD) up -d

docker-prod-down: ## Stop production stack
	$(COMPOSE_PROD) down

logs: ## Tail backend logs
	$(COMPOSE) logs -f backend

logs-all: ## Tail all service logs
	$(COMPOSE) logs -f

# ── Backups ───────────────────────────────────────────────────────────────────
backup: ## Create database backup
	./$(BACKEND_DIR)/scripts/backup.sh

restore: ## Restore database from backup (usage: make restore FILE=./backup/xxx.sql.gz)
	./$(BACKEND_DIR)/scripts/restore.sh $(FILE)

# ── Health ────────────────────────────────────────────────────────────────────
health: ## Check API health endpoints
	@curl -sf http://localhost:4000/health | python3 -m json.tool || echo "❌ API not reachable"
	@curl -sf http://localhost:4000/health/ready | python3 -m json.tool || echo "❌ Readiness check failed"

# ── Kubernetes ────────────────────────────────────────────────────────────────
k8s-apply: ## Apply all Kubernetes manifests
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/postgres-statefulset.yaml
	kubectl apply -f k8s/redis-deployment.yaml
	kubectl apply -f k8s/backend-deployment.yaml
	kubectl apply -f k8s/frontend-deployment.yaml
	kubectl apply -f k8s/ingress.yaml
	kubectl apply -f k8s/hpa.yaml

k8s-delete: ## Remove all Kubernetes resources
	kubectl delete namespace lecturecraft

k8s-status: ## Show pod status
	kubectl get pods -n lecturecraft

# ── Load Testing ──────────────────────────────────────────────────────────────
load-api: ## Run API load test (requires k6)
	k6 run tests/load/api.k6.js

load-ws: ## Run WebSocket load test (requires k6)
	k6 run tests/load/websocket.k6.js

load-ai: ## Run AI generation load test (requires k6 + TEST_TOKEN)
	k6 run -e TEST_TOKEN=$(TOKEN) tests/load/ai-generation.k6.js

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean: ## Remove build artifacts
	rm -rf $(BACKEND_DIR)/dist $(FRONTEND_DIR)/dist
	find . -name "*.js.map" -delete

clean-docker: ## Remove all Docker volumes (destructive!)
	$(COMPOSE) down -v
	docker volume prune -f
