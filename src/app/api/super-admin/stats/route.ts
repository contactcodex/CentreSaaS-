import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/super-admin-auth';

// GET /api/super-admin/stats — super admin dashboard stats
export async function GET() {
  const auth = await verifySuperAdmin();
  if (!auth.success) return auth.response;

  try {
    const now = new Date();

    // Total centres
    const totalCentres = await db.centre.count();

    // Active centres (subscriptionStatus === 'active' and not expired)
    const activeCentres = await db.centre.count({
      where: {
        subscriptionStatus: 'active',
        isActive: true,
        OR: [
          { subscriptionEnd: null }, // unlimited
          { subscriptionEnd: { gt: now } },
        ],
      },
    });

    // Expired centres (subscriptionEnd has passed)
    const expiredCentres = await db.centre.count({
      where: {
        subscriptionEnd: { not: null, lte: now },
        subscriptionStatus: { not: 'none' },
      },
    });

    // Trial centres (trial_24h or trial_7d)
    const trialCentres = await db.centre.count({
      where: {
        subscriptionStatus: { in: ['trial_24h', 'trial_7d'] },
      },
    });

    // Inactive centres
    const inactiveCentres = await db.centre.count({
      where: { isActive: false },
    });

    // Count by subscription status
    const byStatus = await db.centre.groupBy({
      by: ['subscriptionStatus'],
      _count: { id: true },
    });

    // Total users across all centres
    const totalUsers = await db.user.count({
      where: {
        centreId: { not: null },
      },
    });

    // Centres with no subscription (none status)
    const noSubscriptionCentres = await db.centre.count({
      where: { subscriptionStatus: 'none' },
    });

    // Unlimited centres
    const unlimitedCentres = await db.centre.count({
      where: { subscriptionStatus: 'unlimited' },
    });

    return NextResponse.json({
      totalCentres,
      activeCentres,
      expiredCentres,
      trialCentres,
      inactiveCentres,
      noSubscriptionCentres,
      unlimitedCentres,
      totalUsers,
      byStatus: byStatus.map((item) => ({
        status: item.subscriptionStatus,
        count: item._count.id,
      })),
    });
  } catch (error) {
    console.error('Super admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
