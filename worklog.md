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

---
Task ID: 5
Agent: Main Agent
Task: Handle mid-session subscription expiry - show expired page immediately when trial ends

Work Log:
- Added `subscriptionExpired` state + `setSubscriptionExpired` to Zustand store
- Created `centreFetch()` wrapper in store that intercepts 403 + SUBSCRIPTION_EXPIRED responses and sets the expired state
- Created `isExpired()` helper for views to skip error toasts when subscription is expired
- Updated main page (page.tsx) to react to `subscriptionExpired` state and show `SubscriptionExpiredPage` immediately
- Replaced all `fetch('/api/...')` with `centreFetch('/api/...')` in 12 view files (NOT auth or super-admin routes)
- Updated all catch blocks to check `isExpired()` before showing error toasts
- Reset `subscriptionExpired` on logout

Stage Summary:
- When 1-min trial expires while user is in the app, the UI now immediately shows the expired page with phone 0606060606
- No more stuck "loading" screen - the transition is instant
- All API calls in all views use centreFetch for automatic expiry detection
