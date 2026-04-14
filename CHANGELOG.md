# Changelog

## v2.0.0

> Forked from [The-Commit-Company/frappe-js-sdk](https://github.com/The-Commit-Company/frappe-js-sdk) v1.10.0 and rebuilt as `@beninfintech/frappe`.

### Features

- **Vite plugin suite** (`@beninfintech/frappe/vite`) — unified `frappe()` plugin composing:
  - **Proxy plugin** — auto-proxies Frappe backend routes (`/api`, `/app`, `/assets`, etc.) with port auto-detection from `common_site_config.json`
  - **Build config plugin** — auto-detects output directory, base URL, and copies `index.html` for Frappe `www/` routing
  - **Jinja boot data plugin** — injects Frappe boot data via Jinja templates in production builds
  - **DocType type generator** — scans Frappe DocType JSON schemas from the bench and generates TypeScript declaration files per module with cross-module child reference resolution
- **Subpath exports** — package now exports `@beninfintech/frappe` (SDK) and `@beninfintech/frappe/vite` (Vite plugins)
- **Bench utility functions** — `findBenchPath`, `findAppName`, `findAppsFolder`, `getCommonSiteConfig`, `getInstalledAppSites` exported from the vite subpath
- **Window interface augmentation** — typed `window.csrf_token` and Frappe-specific properties via `env.d.ts`

### Build & Tooling

- **Migrated to tsdown** (Rolldown-based bundler) from the previous build setup
- **ESM-only output** — `dist/index.mjs` + `dist/vite/index.mjs` with `.d.mts` declarations
- **`@antfu/eslint-config`** — replaces tslint + prettier with a unified ESLint flat config
- **TypeScript 6.x** with `verbatimModuleSyntax`, `module: "ESNext"`, `moduleResolution: "Bundler"`
- **Vitest** test suite — 89 tests across 9 files covering SDK (auth, db, call, file, app, axios) and Vite plugins (types, jinja, proxy, unified)
- **`tsnapi` API snapshots** — tracks public API surface to guard against accidental breaking changes
- **`publint`** validation — ensures correct package exports on every build
- **`changelogen`** — conventional changelog generation for future releases
- **`pnpm`** as package manager with workspace support
- **`simple-git-hooks`** for pre-commit linting

### Refactors

- **Renamed** `src/frappe_app/` to `src/app/` with `~/` path alias support
- **Import style** — enforced inline type specifiers (`import { type X }`) via ESLint
- **Import sorting** — perfectionist plugin with source-based grouping (external > internal > relative)
- **Module structure** — `"type": "module"` in `package.json`, proper ESM throughout

### Breaking Changes

- Package renamed from `frappe-js-sdk` to `@beninfintech/frappe`
- ESM-only (no more CommonJS output)
- Minimum Node.js version aligned with ESNext target
- Vite `>=5.0.0` required as optional peer dependency for the vite plugin
