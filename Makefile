.PHONY: help dev dev-infra dev-services dev-frontend stop logs clean migrate test build

# ─── Default target ───────────────────────────────────────────
help:
	@echo ""
	@echo "  VAIC — Voice AI Incident Commander"
	@echo "  ─────────────────────────────────"
	@echo "  make dev-infra      Start Docker infra (Kafka, PostgreSQL, Redis)"
	@echo "  make migrate        Run database migrations"
	@echo "  make dev-frontend   Start Next.js dashboard (port 3000)"
	@echo "  make dev-api        Start REST API service (port 3001)"
	@echo "  make dev-nce        Start Classification Engine (port 8001)"
	@echo "  make dev-ism        Start Incident State Manager (port 3003)"
	@echo "  make dev-wsg        Start WebSocket Gateway (port 3002)"
	@echo "  make dev-cdm        Start Conflict Detector (port 8003)"
	@echo "  make dev-vse        Start Voice Synthesis Engine (port 8004)"
	@echo "  make stop           Stop all Docker containers"
	@echo "  make logs           Tail Docker logs"
	@echo "  make test           Run all tests"
	@echo "  make build          Build all Docker images"
	@echo ""

# ─── Infrastructure ───────────────────────────────────────────
dev-infra:
	docker-compose up -d postgres redis zookeeper kafka kafka-init
	@echo "✓ Infrastructure started. Kafka UI at http://localhost:8080"

stop:
	docker-compose down

logs:
	docker-compose logs -f kafka postgres redis

# ─── Migrations ──────────────────────────────────────────────
migrate:
	@echo "Running database migrations..."
	docker exec vaic-postgres psql -U vaic -d vaic -f /docker-entrypoint-initdb.d/01-init.sql 2>/dev/null || echo "Migrations already applied"

# ─── Node.js Services ─────────────────────────────────────────
dev-frontend:
	cd frontend && npm run dev

dev-api:
	cd services/api && npm run dev

dev-ism:
	cd services/incident-state-manager && npm run dev

dev-wsg:
	cd services/websocket-gateway && npm run dev

dev-ais:
	cd services/audio-ingestion && MOCK_AUDIO_MODE=true npm run dev

dev-tig:
	cd services/tool-integration-gateway && npm run dev

# ─── Python Services ─────────────────────────────────────────
dev-nce:
	cd services/classification-engine && uvicorn src.main:app --reload --port 8001

dev-tde:
	cd services/transcription-engine && uvicorn src.main:app --reload --port 8002

dev-cdm:
	cd services/conflict-detector && python src/detector.py

dev-vse:
	cd services/voice-synthesis-engine && python src/engine.py

dev-rpt:
	cd services/report-generator && uvicorn src.main:app --reload --port 8005


# ─── Testing ─────────────────────────────────────────────────
test:
	npm test --workspaces --if-present

test-unit:
	npm run test:unit --workspaces --if-present

test-integration:
	npm run test:integration --workspaces --if-present

test-e2e:
	cd frontend && npx playwright test

# ─── Build ───────────────────────────────────────────────────
build:
	docker build -t vaic/api:local services/api/
	docker build -t vaic/classification-engine:local services/classification-engine/
	docker build -t vaic/conflict-detector:local services/conflict-detector/
	docker build -t vaic/incident-state-manager:local services/incident-state-manager/
	docker build -t vaic/websocket-gateway:local services/websocket-gateway/
	docker build -t vaic/voice-synthesis-engine:local services/voice-synthesis-engine/
	docker build -t vaic/report-generator:local services/report-generator/

# ─── Setup ───────────────────────────────────────────────────
setup:
	@echo "Setting up VAIC local development environment..."
	cp -n .env.example .env || true
	npm install
	@echo "✓ Dependencies installed"
	@echo "Next: Edit .env with your API keys, then run: make dev-infra && make migrate"

clean:
	docker-compose down -v
	rm -rf services/*/dist services/*/node_modules frontend/.next frontend/node_modules node_modules
	@echo "✓ Clean complete"
