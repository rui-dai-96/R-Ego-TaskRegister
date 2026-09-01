# Ropedia Task Register

Production task registration workspace for embodied-intelligence data collection. Admins publish candidate tasks, create Vendor accounts and review submitted designs. Vendors claim available tasks, submit ordered execution steps and track review feedback.

## Stack

- React 19, TypeScript, Vite
- Supabase PostgreSQL, Auth, Row Level Security and Edge Functions
- TanStack Query, React Hook Form and Zod
- Vitest and Testing Library

## Local development

Requirements: Node.js 22+, Docker, and the Supabase CLI.

```bash
cp .env.example .env.local
npm install
npm run db:start
npm run db:reset
npm run dev
```

Copy the API URL and anon key printed by `npx supabase status` into `.env.local`. Without these values, the frontend intentionally enters visual Demo mode.

Create the first Admin user from Supabase Studio or the Auth Admin API, then update its generated profile:

```sql
update public.profiles
set role = 'admin', display_name = 'Admin Console', must_change_password = false
where email = 'admin@ropedia.ai';
```

## Edge Functions

Vendor account administration requires server-only secrets:

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... ALLOWED_ORIGIN=http://localhost:5173
npm run functions:serve
```

Never expose the service-role key through a `VITE_*` environment variable.

## CSV import

Required headers:

```text
一级场景,二级场景,二级任务,三级任务示例名称,三级示例任务步骤,任务数量,上传状态
```

`上传状态` accepts `草稿` or `已发布`. Steps can be separated by `→`, line breaks, or numbered-list markers. The import validates every row before calling the transactional database function.

## Quality checks

```bash
npm run check
npm run db:test
```

`npm run check` runs lint, unit tests, TypeScript compilation, and the production build. Database tests require the local Supabase Docker stack.

## Deployment

1. Link the Supabase project and run `npx supabase db push`.
2. Deploy `create-vendor` and `manage-vendor` with `npx supabase functions deploy`.
3. Configure the production site with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Set `ALLOWED_ORIGIN` to the production web origin.
5. Build with `npm run build` and deploy `dist/` to a static host with SPA fallback enabled.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
# R-Ego-TaskRegister
