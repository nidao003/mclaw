# AGENTS.md

## Codex Memory Rules

- Use `claude-mem` as the default project memory layer.
- Trigger memory search only when the task clearly depends on project history, prior decisions, bugs, architecture, or recent implementation context. Do not search memory on every turn.
- When memory is needed, search first with `mem search`, then narrow with `timeline`, then read details with `get_observations`.
- Always scope memory lookups by project when possible, and do not fetch full observations before filtering.
- Rely on automatic transcript ingestion for normal work. Use manual save only when a key rule or conclusion must be pinned deliberately.

## Claude Sync Protocol

This project is developed by both Claude Code and Codex, with Claude Code as the primary development surface and source of truth. Codex should treat the Claude companion files as the canonical project context, progress ledger, knowledge base, and rule set.

Before Codex starts any non-trivial development task in this repo, read the relevant Claude project companion first:

- Start with `CLAUDE.md`.
- Use `.claude/index.json` for the current project/module map, important paths, tests, and known gaps.
- Use `.claude/skills/**/SKILL.md` for task-specific operations such as deployment.
- Use `.agents/skills/**/SKILL.md` as the mirrored Codex skill copy only after confirming it matches the Claude source when the task depends on that skill.

When the user asks to "更新 AGENTS.md / 同步 Claude / 同步 Claude 的目录 / 获取整个项目信息", always refresh this file from the Claude project companion first:

1. Read `CLAUDE.md` completely.
2. Read `.claude/index.json` for the current module map, important paths, test coverage notes, and gaps.
3. Read `.claude/skills/**/SKILL.md` and compare with `.agents/skills/**/SKILL.md`.
4. If a Claude skill exists but the Agents copy is missing or stale, mirror it into `.agents/skills/<skill-name>/SKILL.md`.
5. Update `AGENTS.md` only as a lightweight Codex bridge to Claude's current project architecture, commands, conventions, deployment notes, docs, and recurring rules.
6. Keep unrelated working-tree changes intact.

Current Claude companion files:

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Primary Claude-facing project guide and change log |
| `.claude/index.json` | Project/module scan, important paths, tests, coverage gaps |
| `.claude/skills/mclaw-deploy/SKILL.md` | Deployment/update playbook for the LAN test server |
| `.agents/skills/mclaw-deploy/SKILL.md` | Agents mirror of the deployment skill |

## Project Overview

`mclaw` is a graphical AI assistant based on OpenClaw. The repo is now a mixed desktop + web + backend workspace:

- Root desktop app: Electron 40+ / React 19 / Vite 7 / TypeScript.
- Web app: `apps/web`, the Skills Hub web SPA.
- Backend: `backend`, Go 1.25 service with Echo, Ent, PostgreSQL, Redis, and modular biz packages.
- Shared layer: `packages/shared`, shared React components, API clients, types, hooks, and stores for desktop + web.
- CLI: `packages/cli`, `mclaw-skills`, a universal AI skill package manager supporting Registry / Git / npm install sources.
- Package manager: `pnpm@10.33.4` pinned in `package.json`.

The project was originally ClawX/OpenClaw-oriented; current local docs and code are mclaw-oriented. Prefer current `CLAUDE.md`, `docs/design-spec.md`, and `.claude/index.json` over older wording when names conflict.

## Core Commands

| Task | Command |
|------|---------|
| Install deps + bundled tools | `pnpm run init` |
| Desktop dev server | `pnpm dev` |
| Web dev server | `pnpm dev:web` or `pnpm --filter @mclaw/web dev` |
| Web app build | `pnpm --filter @mclaw/web build` |
| Build frontend only | `pnpm run build:vite` |
| Lint with auto-fix | `pnpm run lint` |
| Lint check only | `pnpm run lint:check` |
| Web type check | `pnpm run typecheck:web` |
| Node/Electron type check | `pnpm run typecheck:node` |
| Full type check | `pnpm run typecheck` |
| Unit tests | `pnpm test` |
| E2E tests | `pnpm run test:e2e` |
| Harness CI parity | `pnpm run harness:ci` |
| Comms replay metrics | `pnpm run comms:replay` |
| Comms baseline refresh | `pnpm run comms:baseline` |
| Comms regression compare | `pnpm run comms:compare` |

For backend work, inspect `backend/go.mod`, `backend/build/Dockerfile`, and local scripts before adding new commands. Deployment builds use Docker Compose and the `minimal` Go build tag.

## Required Reading Before UI Work

Read these before adding or changing user-visible UI:

1. `docs/DESIGN.md` — design source from QClaw reverse engineering.
2. `docs/design-spec.md` — mclaw implementation-specific design spec.
3. `src/styles/globals.css` — design tokens and component substitution rules for desktop UI.
4. For Skills Hub web work, also inspect `apps/web/src/styles/globals.css` and shared UI components under `packages/shared/src/components/`.

Important design decisions:

- mclaw brand orange stays `#EE7C4B`; do not drift back to the older red source color.
- Use lucide icons for functional iconography; do not use emoji as feature icons.
- Desktop layout is a conditional three-column pattern: fixed icon/text rail, chat-only resizable sidebar, flexible main content.
- User-facing copy must go through i18n. Desktop locales live under `shared/i18n/locales/<lang>/`; web/shared copy should follow the local app/shared i18n pattern already present.
- New user-visible desktop UI changes should include or update Electron E2E coverage.

## Architecture Map

### Desktop Electron

| Area | Important paths | Notes |
|------|-----------------|-------|
| Main process | `electron/main/index.ts`, `electron/main/ipc-handlers.ts` | Window lifecycle, IPC handlers, host API registry |
| Gateway manager | `electron/gateway/manager.ts`, `electron/gateway/ws-client.ts`, `electron/gateway/supervisor.ts` | Gateway start/stop/restart, WS events, recovery |
| Host services | `electron/services/*-api.ts` | Main-owned backend/API boundary |
| Preload | `electron/preload/index.ts` | Context bridge only |
| Renderer API | `src/lib/host-api.ts`, `src/lib/host-api-client.ts` | Renderer entry point for backend calls |
| Stores | `src/stores/` | Zustand state |
| Pages | `src/pages/` | Chat, Agents, Channels, Skills, Cron, Models, Settings, Setup, Dreams, ImageGeneration |
| Layout/UI | `src/components/layout/`, `src/components/ui/` | Main layout, rail/sidebar, reusable UI |

Renderer/Main boundary:

- Renderer must use `src/lib/host-api.ts` and `src/lib/api-client.ts` / `src/lib/host-api-client.ts` as the single entry for backend calls.
- Do not add direct `window.electron.ipcRenderer.invoke(...)` calls in pages/components.
- Do not call Gateway HTTP endpoints directly from renderer.
- Transport policy is Main-owned and fixed as `WS -> HTTP -> IPC fallback`.

### Web / Skills Hub

| Area | Important paths | Notes |
|------|-----------------|-------|
| Web SPA | `apps/web/src/pages/`, `apps/web/src/components/`, `apps/web/src/lib/` | Skills Hub frontend |
| Shared UI/API | `packages/shared/src/components/`, `packages/shared/src/api/`, `packages/shared/src/hooks/`, `packages/shared/src/stores/` | Shared desktop/web building blocks |
| Skills CLI | `packages/cli/src/` | `mclaw-skills` CLI, Registry/Git/npm installation |
| Distribution docs | `docs/knowledge/skills-hub-distribution.md` | CLI + Registry API + Web install flow |

### Go Backend

| Area | Important paths | Notes |
|------|-----------------|-------|
| Server entry | `backend/cmd/server/` | Go backend entry |
| Biz modules | `backend/biz/` | skill, user, admin, subscription, payment, wallet, project, task, etc. |
| Ent schema/generated DB | `backend/ent/`, `backend/db/` | PostgreSQL/Ent model layer |
| Middleware | `backend/middleware/` | auth, CORS, request flow |
| Build | `backend/build/Dockerfile` | Docker build with `-tags minimal` |

Deployment-specific backend caveats are documented in `.claude/skills/mclaw-deploy/SKILL.md` and mirrored under `.agents/skills/mclaw-deploy/SKILL.md`.

## Project Docs Index

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Claude project guide, current architecture notes, change log |
| `.claude/index.json` | Module scan and test coverage map |
| `docs/design-spec.md` | mclaw design implementation spec |
| `docs/DESIGN.md` | QClaw reverse-engineered design source |
| `docs/knowledge/skills-hub-distribution.md` | Skills Hub open distribution system |
| `docs/deploy.md` | Deployment notes |
| `docs/dev-workflow.md` | Development workflow notes |
| `docs/project-restructure-plan.md` | Restructure plan |
| `docs/mclaw-web-migration-plan.md` | Web migration plan |
| `docs/backend-tech-selection-research.md` | Backend technology research |
| `docs/skills-cross-platform-research.md` | Cross-platform skills research |
| `docs/upgrade-v0.4.9-qclaw-mode.md` | v0.4.9 / QClaw mode upgrade notes |
| `harness/specs/` | Scenario/task/rule specs for AI coding validation |

## Validation Rules

- For UI changes, update or add relevant E2E specs when the behavior is user-visible.
- For i18n, keep locale coverage complete for affected namespaces.
- For communication paths touching gateway events, runtime send/receive, delivery, or fallback, run `pnpm run comms:replay` and `pnpm run comms:compare`.
- For renderer/Main/host-api/api-client/Gateway/OpenClaw runtime paths, start from a task spec under `harness/specs/tasks/` referencing `gateway-backend-communication`; run `pnpm harness validate --spec <task-spec>` before review and `pnpm harness run --spec <task-spec>` or `--dry-run` as appropriate.
- After functional or architecture changes, review `README.md`, `README.zh-CN.md`, and `README.ja-JP.md`; update docs in the same PR/commit if behavior, flows, or interfaces changed.
- Run `pnpm run harness:ci` for local/CI harness parity when touching harness-covered behavior.

## Non-obvious Caveats

- `pnpm run init` runs dependency install, bundled uv download, and bundled agent-browser download.
- Electron headless Linux dbus errors are expected and usually harmless.
- `pnpm run lint` may hit a transient `temp_uv_extract` race after uv download; rerun after the download finishes.
- Optional build-script warnings for messaging/media dependencies are usually safe to ignore.
- Gateway readiness is not required for most UI development; the app should remain navigable while Gateway is connecting.
- The app uses `electron-store`, OS keychain, and local config/session files; no desktop database setup is required.
- Token usage history comes from structured OpenClaw session transcript `.jsonl` files, including normal, `.deleted.jsonl`, and `.jsonl.reset.*` sources unless hard-deleted by the app.
- Models page 7-day/30-day filters are rolling windows, not calendar-month buckets.

## Deployment Skill

Use the `mclaw-deploy` skill when the user mentions deployment, test server, `[REDACTED]`, Docker Compose, nginx, updating frontend/backend, restarting services, or database migration.

Skill files:

- Claude source: `.claude/skills/mclaw-deploy/SKILL.md`
- Agents mirror: `.agents/skills/mclaw-deploy/SKILL.md`

The skill contains the server architecture, account details, Docker Compose flow, validation commands, and troubleshooting notes. Read it before running deployment commands.

## Current Change Log Highlights

- 2026-06-09: Established mclaw design docs and project-level `CLAUDE.md`.
- 2026-06-09: Sidebar changed to fixed-width three-column layout with two-character Chinese menu labels.
- 2026-06-10: Go backend migrated in with biz modules and Ent schema compiling.
- 2026-06-11: Skills Hub Web SPA skeleton and `packages/shared` shared layer expanded.
- 2026-06-11: Shared UI components, hooks, stores, web pages, CORS, subscription store, admin review page, and API key flow added.
- 2026-06-12: Skills Hub web design spec applied across web/shared components.
- 2026-06-12: Skills Hub open distribution system added: `mclaw-skills` CLI, Registry API download/manifest, Web install modal, and SKILL.md package format.
