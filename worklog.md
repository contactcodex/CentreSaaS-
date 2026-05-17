---
Task ID: 1
Agent: Main Agent
Task: Fix login, verify data isolation, fix subscription timing, ensure server runs

Work Log:
- Found dev server was not running / process kept dying
- Found .env file owned by root (from previous session), causing DATABASE_URL not to load in spawned processes
- Found super admin password was corrupted (bcrypt hash didn't match "Codex@123") - reset it
- Restarted dev server with explicit env vars passed to spawn
- Verified ALL API routes already have centreId filtering (students, teachers, classrooms, services, payments, promotions, pack-discounts, teacher-payments, schedules, users, dashboard, backup, centre-info)
- Fixed super-admin-view.tsx: handleEditSubmit no longer sends subscriptionStart/subscriptionEnd when assigning packs (timer now correctly starts on first login only)
- Fixed super-admin-view.tsx: handleActivateTrial no longer sends subscriptionStart/subscriptionEnd
- Verified logout button exists in both super admin view and centre admin view
- Verified subscription expired page shows phone 0606060606
- Full end-to-end test: login → auth/me → super-admin/stats → super-admin/centres all working

Stage Summary:
- Login is working with codexadmin@gmail.com / Codex@123
- Data isolation is complete - all routes filter by centreId
- Subscription timing starts on first login, not on pack assignment
- Logout button present in all views
- Subscription expiry page shows support phone 0606060606
- Dev server needs explicit DATABASE_URL env var due to .env being owned by root
