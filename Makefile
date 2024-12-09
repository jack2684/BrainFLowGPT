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
	npx prisma migrate dev 
	pnpm run prisma:push
# Execute all migration files in order
db-migrations:
	npx prisma migrate dev 
	pnpm run prisma:generate

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


