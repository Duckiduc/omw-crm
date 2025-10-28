# OMW CRM Docker Management

.PHONY: help dev prod build stop clean logs migrate

help: ## Show this help message
	@echo "OMW CRM Docker Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment with hot reload
	docker-compose -f docker-compose.dev.yml up --build

dev-d: ## Start development environment in detached mode
	docker-compose -f docker-compose.dev.yml up -d --build

prod: ## Start production environment
	docker-compose up --build -d

build: ## Build all containers without starting
	docker-compose build

stop: ## Stop all running containers
	docker-compose -f docker-compose.dev.yml down
	docker-compose down

clean: ## Stop containers and remove volumes (⚠️  deletes data)
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose down -v
	docker system prune -f

logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-db: ## Show database logs
	docker-compose logs -f db

migrate: ## Run database migrations
	docker-compose exec backend npm run migrate:all

db-shell: ## Access database shell
	docker-compose exec db psql -U postgres -d omw_crm

backend-shell: ## Access backend container shell
	docker-compose exec backend sh

status: ## Show container status
	docker-compose ps

restart: ## Restart all services
	docker-compose restart

backup-db: ## Backup database to backup.sql
	docker-compose exec db pg_dump -U postgres omw_crm > backup.sql
	@echo "Database backed up to backup.sql"

restore-db: ## Restore database from backup.sql
	docker-compose exec -T db psql -U postgres omw_crm < backup.sql
	@echo "Database restored from backup.sql"