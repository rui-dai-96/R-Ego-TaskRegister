# Edit Log

## v1.1.0 — 2026-09-01

- Removed the claim-quantity field; each Vendor submission now always represents exactly one task design.
- Added debounced fuzzy search for task names and codes, backed by a PostgreSQL trigram index.
- Replaced fixed scene and task filters with role-aware options derived from current database data.
- Added Admin review views for every submission status and retained scene, task, and Vendor filters.
- Added direct page-number entry to Admin candidate tasks, Vendor claims, review queues, and Vendor results.
- Added server-side candidate sorting by task code, scene, total, approved, pending, and remaining counts.
- Expanded Vendor review results into a searchable, paginated table with the level-three design name, ordered steps, full scene taxonomy, review status, and review feedback.
- Kept the local visual Demo behavior aligned with the production workspace.

## v1.0.0 — 2026-08-31

- Rebuilt the Demo as a production React application with routing, Supabase sessions, role guards, query caching, validated forms, and lazy-loaded workspaces.
- Added PostgreSQL tables, indexes, count constraints, RLS policies, audit triggers, seed data, and atomic task claim, review, CSV import, and resubmission functions.
- Added Admin-only Edge Functions for creating and enabling/disabling Vendor authentication accounts without exposing the service-role key.
- Connected Admin candidate-task CRUD, task details, CSV validation/import, review filters, complete same-task context, and Vendor management to the data layer.
- Connected Vendor paginated task discovery, transactional design submission, review results, feedback, and revision resubmission to the data layer.
- Added first-login forced password changes, session restoration, disabled-account checks, environment templates, local Supabase commands, deployment documentation, and CSV unit tests.
- Preserved an environment-controlled Demo mode for design review without a running backend.

## v0.2.0 — 2026-08-31

- Added total, approved, pending-review, and remaining counts to each candidate task.
- Added a candidate-task detail page with complete pending and approved design lists.
- Changed the review queue to switch submissions in place without opening a modal.
- Added scene, task, and Vendor filters to the Admin review workspace.
- Expanded approved same-level review context to include every design name and its full step list.
- Replaced Vendor task cards with a compact paginated table designed for thousands of rows.

## v0.1.0 — 2026-08-31

- Initialized the React and TypeScript web application.
- Added the Ropedia brand logo, color system, responsive dashboard shell, and requested typography.
- Added Admin candidate-task management with search, filters, summary metrics, create/delete actions, and CSV import flow.
- Added Admin review queue with same-task approved-design context and review decisions.
- Added Vendor account management.
- Added Vendor task discovery, claim/design form, and submission review results.
- Added responsive layouts for desktop, compact sidebar, and mobile screens.
- Added local interaction feedback through modals and toast notifications.
