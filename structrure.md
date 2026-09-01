# Ropedia Task Register — Product Structure

## Product goal

A two-role workspace for registering embodied-intelligence data collection tasks. Admins manage candidate tasks, review vendor designs, and manage vendor accounts. Vendors claim available tasks, submit their own level-three task designs, and track review results.

## Roles and navigation

### Admin
- Candidate tasks: list, search, filter, create, edit, delete, and CSV batch import.
- Task review: review vendor-submitted level-three designs while referencing approved designs for the same candidate task.
- Candidate task detail: inspect all pending and approved vendor designs belonging to one candidate task.
- Vendor management: review vendor status and delivery metrics, invite or disable accounts.

### Vendor
- Claim tasks: browse published candidates with non-zero availability, claim one, and submit a unique level-three name and executable steps.
- Review results: track pending, approved, and revision-required submissions.

## Candidate task data
- Level-one scene
- Level-two scene
- Level-two task
- Level-three example task name
- Level-three example task steps
- Available quantity
- Total target quantity
- Approved design count
- Pending-review design count
- Upload status

## Current implementation
- React + TypeScript + Vite production application with route guards and query caching.
- Supabase PostgreSQL persistence, Auth sessions, Row Level Security, database functions, audit logs, and Edge Functions.
- The local in-memory interface remains available only when Supabase environment variables are absent, as a visual Demo mode.
- Production roles are derived from the authenticated profile and cannot be switched in the UI.
- Review queues switch in place without opening a modal; scene, task, and vendor filters are available.
- Vendor task discovery uses a paginated table suitable for thousands of level-three tasks.
- Brand palette: black, off-white, and `#CCFFA0`.
- Display font: Space Grotesk. Body font: Inter Tight.

## Production modules
- `src/features/auth`: session restoration, login, first-login password change, and protected routes.
- `src/features/dashboard`: Demo workspace and database-backed production workspace.
- `src/services`: typed Supabase data access for tasks, submissions, reviews, and Vendors.
- `src/utils/csv.ts`: CSV validation, normalization, duplicate detection, and template generation.
- `supabase/migrations`: schema, RLS policies, audit triggers, atomic claim/review/import/resubmit functions, and reporting view.
- `supabase/functions`: Admin-only Vendor account creation and enable/disable operations.

## Security invariants
- Browser clients receive only the Supabase anon key.
- The service-role key exists only in Edge Function secrets.
- RLS limits Vendors to published tasks and their own submissions.
- Claims and reviews lock affected records and update task capacity transactionally.
- Vendor temporary passwords must be replaced on first login.
