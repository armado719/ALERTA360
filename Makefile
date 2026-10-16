.PHONY: help install dev build preview clean

help:
	@echo "🌍 ALERTA360 — Makefile Commands"
	@echo ""
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Start development server"
	@echo "  make build      - Build for production"
	@echo "  make preview    - Preview production build locally"
	@echo "  make clean      - Remove node_modules and dist"
	@echo "  make lint       - Type check with TypeScript"
	@echo ""

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

type-check:
	npm run type-check

clean:
	rm -rf node_modules dist

audit:
	npm audit

audit-fix:
	npm audit fix

.DEFAULT_GOAL := help
