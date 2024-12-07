.PHONY: dev setup db-push db-studio supabase-migration supabase-push supabase-generate db-migrations

install:
	pnpm install
	pnpm install @supabase/supabase-js

dev:
	pnpm run dev

setup:
	pnpm install
	supabase init --force
	supabase start || (supabase stop && supabase start)
	make db-migrations
	pnpm run prisma:generate
	pnpm run prisma:push

# Execute all migration files in order
db-migrations:
	$(eval include .env)
	$(eval export)
	@echo "Executing database migrations..."
	@if [ ! -d "prisma/migrations" ]; then mkdir -p prisma/migrations; fi
	@for file in prisma/migrations/*.sql; do \
		if [ -f "$$file" ]; then \
			echo "Executing migration: $$file"; \
			psql "$(DATABASE_URL)" -f "$$file" || exit 1; \
		fi \
	done
	@echo "Migrations completed successfully"
	DATABASE_URL="$(DATABASE_URL)" npx prisma migrate dev --name init

db-push:
	npx prisma db push

db-generate:
	npx prisma generate

clean:
	supabase stop
	rm -rf supabase/config.toml

reset: clean setup

db-studio:
	npx prisma studio

supabase-start:
	supabase start || (supabase stop && supabase start)

supabase-stop:
	supabase stop

supabase-status:
	supabase status

