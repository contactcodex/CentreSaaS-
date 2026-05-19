---
Task ID: 1
Agent: Main
Task: Fix all pending issues and deploy to Vercel

Work Log:
- Investigated why subscription was showing expired for iwan centre (was set to trial_24h instead of active+1year)
- Fixed DB directly: set iwan centre to subscriptionStatus=active, subscriptionPack=1year, reset timer
- Discovered critical bug in teacher payment calculation: Payment.month stores "May" but calc queried "5"
- Rewrote /api/teacher-payments/route.ts calculation with proper MONTH_NAMES mapping
- Added deduplication of payments per student in teacher calc
- Fixed 16th rule implementation for payment period logic
- Added paidAmount per student in CalculationData and teacher-payments-view
- Rewrote /api/payments/overdue/route.ts (was returning empty array stub)
- Pushed code to GitHub and deployed to Vercel (codex-centre.vercel.app)
- Production deployment confirmed READY and accessible

Stage Summary:
- DB fix: iwan centre now has 1-year active subscription
- Bug fix: Teacher payment calculation now correctly matches month names
- Bug fix: Overdue payments endpoint now returns actual overdue data
- Deployed to: https://codex-centre.vercel.app
- Vercel project: prj_9xef5L1Hc757KKz2kf8wsAfWQdf4
---
Task ID: 2
Agent: Main
Task: Fix logo and centre name not updating live in app and receipts

Work Log:
- Analyzed the root cause: logo/name saved to DB but sidebar/header/bon used stale data from initial mount fetch
- Added `centreInfo` state + `refreshCentreInfo()` to Zustand store (`src/store/store.ts`)
- Updated `page.tsx` to use `displayCentreName` and `displayLogoUrl` computed from store + auth state
- Updated `settings-view.tsx` to call `refreshCentreInfo()` after logo save, name save, and logo remove
- Updated `payments-view.tsx` to use store's centreInfo for bon generation instead of local stale state
- Updated `/api/centre-info` to merge `center_name` from settings with `Centre.name`
- Updated `/api/settings` PUT to also update `Centre.name` when `center_name` setting is saved
- Updated `/api/auth/me` to merge `center_name` from settings into initial auth response
- Updated `/api/upload-logo` to return full centre info including name from settings
- Deployed to Vercel: https://my-project-codex-04300735.vercel.app

Stage Summary:
- Centre logo and name now update immediately across the entire app (sidebar, mobile header, receipts) after saving in settings
- No page refresh needed — changes are reactive through Zustand store
- Student bon uses live store data, teacher bon uses fresh DB queries
