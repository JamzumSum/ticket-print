# ticket-print (火车票排版打印)

Web tool for arranging Chinese train e-ticket PDFs onto A4 landscape pages for printing.

## Commands

All commands run from `app/`:
```bash
cd app
npm install        # requires Node >=24
npm run dev        # Vite dev server on http://localhost:3000
npm run build      # tsc -b && vite build → app/dist/
npm run lint       # ESLint
npm run preview    # vite preview
```

Verify: `npm run lint && npm run build`.

## Architecture

- **Monorepo?** No. Single app in `app/`.
- **Entrypoint**: `app/src/main.tsx` → `BrowserRouter` (dynamic basename) → `App.tsx` → `Home.tsx`
- **Routing**: react-router, single route `/`
- **State**: `useState` in `Home.tsx`, no global store
- **PDF pipeline**: `pdfjs-dist` for rendering previews → `findCropRect` canvas scan for auto-crop → `pdf-lib` for vector export (embedding source pages with optional crop box)
- **DnD**: Pointer events (no library for drag-to-cell; `@dnd-kit` present but unused in active code)
- **shadcn/ui**: New York style, CSS variables, `@/components/ui/*`, `@/lib/utils` (cn helper)
- **Theme**: `[data-theme="dark"]`/`[data-theme="light"]` on `<html>`, stored in `localStorage` key `ticket-theme`

## TypeScript quirks

- `verbatimModuleSyntax` — use `import type` for type-only imports
- `noUnusedLocals`, `noUnusedParameters` — both strict
- `erasableSyntaxOnly` — no enums, no namespaces, no parameter properties
- `@/` path alias: `@/components/...`, `@/lib/...`, `@/hooks/...`
- Build includes `tsc -b` (project references: `tsconfig.app.json` + `tsconfig.node.json`)

## Deploy

- GitHub Pages via `.github/workflows/deploy-pages.yml` on push to `main`
- Vite `base: './'` (relative paths for Pages subpath)
- `BrowserRouter` basename computed dynamically in `main.tsx`
- CI runs in `app/` directory: `npm ci` → `npm run build` → upload `app/dist`

## Tests

No test framework or test scripts exist. No test files in source tree.

## Project structure

```
ticket-print/
├── AGENTS.md
├── app/            ← all source code
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/Home.tsx         ← main page (all state + logic)
│   │   ├── components/
│   │   │   ├── Preview.tsx        ← A4 preview with drag-to-cell
│   │   │   ├── TicketList.tsx     ← ticket file list
│   │   │   ├── Logo.tsx
│   │   │   └── ui/               ← shadcn/ui components (53 files)
│   │   ├── lib/
│   │   │   ├── pdf.ts            ← PDF render, crop, layout, export
│   │   │   ├── naming.ts         ← trip date parsing + file naming
│   │   │   └── utils.ts          ← cn() helper
│   │   ├── hooks/use-mobile.ts
│   │   └── index.css             ← Tailwind + CSS variable theme
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── eslint.config.js
│   └── tsconfig*.json
├── .github/workflows/deploy-pages.yml
└── README.md
```
