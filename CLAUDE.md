# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn tauri:dev       # Start dev server (Vite + Rust hot-reload)
yarn tauri:build     # Build x64 .exe installer
yarn x86             # Build i686 .exe installer
```

No test suite exists in this project.

## Architecture

**WarsztatKarta** is a desktop workshop management app (car repair shop). It is built with Tauri v2 (Rust backend) + React 19 + TypeScript + Tailwind CSS v3.

### Data flow

```
React component
  → invoke() wrapper in src/utils/db.ts
    → Tauri IPC
      → Rust command in src-tauri/src/commands.rs
        → rusqlite (SQLite at %APPDATA%\warsztatkarta\app.db)
```

All DB access goes through a single `DbState(Mutex<Connection>)` held in Tauri's app state. There is no connection pooling — every command locks the mutex, queries, and releases.

### Frontend state split

- **Navigation**: `useAppStore` (Zustand, `src/stores/index.ts`) — holds current `Widok` enum and `aktywneZlecenieId`. The `karta` view is a sub-view of `zlecenia`; the sidebar highlights "Zlecenia" when `widok === 'karta'`.
- **Domain UI state**: `useKlienci`, `useZlecenia` (Zustand) — selected item + modal open/close flags only.
- **Server data**: React Query (`useQuery`/`useMutation`) inside components — cache key conventions match command names (e.g. `['zlecenia']`, `['zlecenie', id]`).

### Domain model

Three independent entities: `klienci`, `pojazdy`, `zlecenia`. Vehicles have **no** `klient_id` — they are global. A work order (`zlecenie`) links a client + vehicle together via `klient_id` + `pojazd_id` on the `zlecenia` table. `KartaZlecenia` loads all vehicles globally; client and vehicle are chosen independently.

A `zlecenie` has two line-item tables:
- `pozycje_robocizna` — labor (hours × rate)
- `pozycje_czesci` — parts (qty × price)
- `zdjecia` — photos stored as base64 data URLs

`zapisz_pozycje` uses a DELETE-then-INSERT replace pattern (not upsert).

`KartaZlecenia.zapisz()` always calls `editMut` (aktualizuj_zlecenie) after saving positions to persist computed totals.

### Tauri IPC naming rules

- Rust command names: `snake_case` (e.g. `pobierz_zlecenie`)
- JS invoke call: first argument is the snake_case command name
- **Top-level primitive params** in Rust (e.g. `id: i64`, `zlecenie_id: i64`, `status: String`) must be sent as **camelCase** from JS (e.g. `{ id }`, `{ zlecenieId }`, `{ status }`)
- **Struct params** (e.g. `klient: NowyKlient`) are unaffected — their inner fields use serde's default snake_case

### CSS conventions

- `.input` and `.label` are utility component classes defined in `src/index.css` via `@layer components`
- Never use dynamic Tailwind class strings (e.g. `` `bg-${color}-100` ``) — Tailwind's JIT cannot detect them; use full static strings instead

### DB migration

`db.rs:migracja()` runs on every startup. It creates tables with `CREATE TABLE IF NOT EXISTS`, then checks for the legacy `klient_id` column on `pojazdy` via `pragma_table_info` and recreates the table without it if found. Any new schema changes should follow this pattern.
