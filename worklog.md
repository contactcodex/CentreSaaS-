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
