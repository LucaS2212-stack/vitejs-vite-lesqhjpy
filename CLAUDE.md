# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Athlete Tracker — a React/Vite + Supabase app for tracking nutrition and training (bodybuilding cut/bulk cycles). Deployed on Vercel with auto-deploy from GitHub. **This local folder has no `.git`** — it is not currently connected to that GitHub remote (see `roadmap-athlete-tracker.md` for details/action items). Treat any git setup as something to confirm with the user before assuming pushes will reach production.

Before starting work, read `roadmap-athlete-tracker.md` in this same folder — it tracks design decisions, known inconsistencies, and open items agreed with the user.

## Commands

Run from this directory (`vitejs-vite-lesqhjpy-main/` — this is the actual project root, not the parent folder):

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server (default http://localhost:5173)
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — ESLint

There is no test runner configured in this project (no test script, no test files).

Node.js is required but is not guaranteed to be preinstalled in every environment this repo is opened in — check with `node --version` before assuming it's available.

## Architecture

**Almost the entire app lives in one file: `src/App.jsx` (~2100 lines).** `src/main.jsx` only mounts `<App/>`. There is no router — navigation is a `tab` string in `App()`'s state, switched by the sidebar (desktop) / bottom nav (mobile), and JSX is conditionally rendered per tab inside one big `return`.

Reading order for `App.jsx` when making changes:
1. Top of file: pure helper functions (`buildLinePath`, `pointPct`, date/format helpers), then the design tokens — `TYPE` (typography scale, applied via `typeStyle(TYPE.x, C, extra)`) and `DARK` / `LIGHT` (full color palettes; active theme is `C = isDark ? DARK : LIGHT`, persisted to `localStorage`).
2. Reusable presentational components declared at module scope, above `App()`: `Card`, `Kicker`, `KPI`, `Tag`, `Seg`, `MBar`, `CTip`, `FloatingBadge`. These take `C` (the active theme) as a prop rather than reading context.
3. Larger standalone sub-components with their own local state: `AuthScreen`, `MealPlan`, `PlanningSetup`.
4. `export default function App()` — one component holding ~30 `useState` hooks, all Supabase reads/writes, and every tab's JSX.

**Charts use two different approaches that coexist intentionally (for now):** the Dashboard's weight hero chart is hand-drawn SVG using `buildLinePath()`/`pointPct()` (no charting library, custom glow via CSS `drop-shadow`). Every other chart (Peso tab weekly average, Piano/Planning progression charts) uses `recharts` (`AreaChart`/`Area`). Match whichever approach the section you're editing already uses; don't silently swap one for the other.

**Supabase**: client is created once at module scope in `App.jsx` (`const sb = createClient(SUPA_URL, SUPA_KEY)`) with the URL/anon key hardcoded inline — this is normal for Supabase's anon key (protection is expected to come from Row Level Security), but don't assume RLS is actually configured on every table without checking. Tables in use: `athlete_days`, `athlete_weight`, `athlete_plan_history`, `athlete_planning`, `athlete_meal_plan`, `athlete_foods`, `athlete_week_checkin` — all scoped by `user_id`.

**ON/OFF day model**: `dayPattern` (Mon–Sun → `"on"`/`"off"`) auto-assigns a day type, which selects macro targets from `plan` (`plan.onCal`/`plan.offCal`/etc.). A specific date can override the pattern by storing an explicit `type` on that day's `athlete_days` row (see `upsertDay`). `planHistory` keeps a dated log of `plan` changes so past days can be evaluated against the plan that was active at the time (`getPlanAt`).

**Food search** (`api/fatsecret.js`, a Vercel serverless function): despite the filename, it does not call the FatSecret API — it queries Open Food Facts and USDA FoodData Central (using USDA's public rate-limited `DEMO_KEY`). Barcode lookup goes straight from the client to the Open Food Facts API; camera scanning uses `html5-qrcode`.

**Demo mode** (`demoMode` state, toggled in the header): only swaps in synthetic data (`generateDemoData()`) for the Dashboard's weight hero chart and the "media passi" KPI card. It does not touch any other tab, and does not prevent Supabase reads/writes elsewhere — don't assume a `demoMode` check exists for a given piece of UI without verifying.

**Responsive layout** branches on a one-time `window.innerWidth >= 768` check at render time to choose sidebar (desktop) vs. bottom nav (mobile) — there is no resize listener, so this doesn't react to window resizing without a reload.

**TypeScript scaffolding is unused**: `tsconfig*.json` and TS-related devDependencies are present (project was bootstrapped from a TS template), but all source files are `.jsx`/`.js`, not `.ts`/`.tsx`.
