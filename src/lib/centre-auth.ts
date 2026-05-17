import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export interface CentreAuth {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  centreId: string;
  centreName: string;
  centreLogoUrl: string | null;
}

// Duration map for subscription types
const DURATION_MAP: Record<string, number> = {
  trial_1min: 60 * 1000,                           // 1 minute
  trial_24h: 24 * 60 * 60 * 1000,                  // 24 hours
  trial_7d: 7 * 24 * 60 * 60 * 1000,               // 7 days
};

const PACK_DURATION_MAP: Record<string, number> = {
  '1month': 30 * 24 * 60 * 60 * 1000,              // ~30 days
  '1year': 365 * 24 * 60 * 60 * 1000,              // ~365 days
};

function getDurationMs(status: string, pack: string): number | null {
  if (DURATION_MAP[status]) return DURATION_MAP[status];
  if (status === 'active' && PACK_DURATION_MAP[pack]) return PACK_DURATION_MAP[pack];
  return null;
}

/**
 * Authenticate a centre user and check subscription.
 * - Reads `auth_token` cookie
 * - Returns CentreAuth if valid
 * - Starts subscription timer on first login if needed
 * - Returns error response if subscription expired
 */
export async function getCentreAuth(request: NextRequest): Promise<
  | { success: true; auth: CentreAuth }
  | { success: false; response: NextResponse }
> {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return { success: false, response: NextResponse.json({ error: 'unauthorized', code: 'NO_AUTH' }, { status: 401 }) };
  }

  try {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: { include: { centre: true } } },
    });

    if (!session || session.expiresAt < new Date() || session.user.status !== 'active') {
      if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return { success: false, response: NextResponse.json({ error: 'unauthorized', code: 'NO_AUTH' }, { status: 401 }) };
    }

    const user = session.user;

    // SUPER_ADMIN bypasses centre checks
    if (user.role === 'SUPER_ADMIN') {
      return { success: false, response: NextResponse.json({ error: 'super_admin', code: 'SUPER_ADMIN' }, { status: 403 }) };
    }

    const centre = user.centre;
    if (!centre) {
      return { success: false, response: NextResponse.json({ error: 'no_centre', code: 'NO_CENTRE' }, { status: 403 }) };
    }

    if (!centre.isActive) {
      return { success: false, response: NextResponse.json({
        error: 'centre_disabled',
        code: 'CENTRE_DISABLED',
        message: 'Your centre has been disabled. Please contact support.',
      }, { status: 403 }) };
    }

    // ── Subscription logic ─────────────────────────────────────────────────
    const status = centre.subscriptionStatus;
    const pack = centre.subscriptionPack;

    // No subscription at all
    if (status === 'none' || status === 'expired') {
      return { success: false, response: NextResponse.json({
        error: 'subscription_expired',
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'La période d\'essai est terminée. Veuillez contacter le support Codex au 0606060606 pour activer votre abonnement.',
        supportPhone: '0606060606',
      }, { status: 403 }) };
    }

    // Unlimited subscription
    if (status === 'unlimited') {
      return {
        success: true,
        auth: {
          userId: user.id,
          userEmail: user.email,
          userName: user.fullName,
          userRole: user.role,
          centreId: centre.id,
          centreName: centre.name,
          centreLogoUrl: centre.logoUrl,
        },
      };
    }

    // ── Start subscription timer on first access ───────────────────────────
    if (!centre.subscriptionStart && status !== 'none' && status !== 'expired') {
      const durationMs = getDurationMs(status, pack);
      const now = new Date();
      const end = durationMs ? new Date(now.getTime() + durationMs) : null;

      await db.centre.update({
        where: { id: centre.id },
        data: {
          subscriptionStart: now,
          subscriptionEnd: end,
        },
      });

      // Check if duration was 0 or unset (shouldn't happen, but safety)
      if (!durationMs) {
        return { success: false, response: NextResponse.json({
          error: 'subscription_expired',
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'La période d\'essai est terminée. Veuillez contacter le support Codex au 0606060606 pour activer votre abonnement.',
          supportPhone: '0606060606',
        }, { status: 403 }) };
      }

      // Return auth (subscription just started, not expired yet)
      return {
        success: true,
        auth: {
          userId: user.id,
          userEmail: user.email,
          userName: user.fullName,
          userRole: user.role,
          centreId: centre.id,
          centreName: centre.name,
          centreLogoUrl: centre.logoUrl,
        },
      };
    }

    // ── Check if subscription has expired ──────────────────────────────────
    if (centre.subscriptionEnd && new Date() > centre.subscriptionEnd) {
      // Mark as expired in DB
      await db.centre.update({
        where: { id: centre.id },
        data: { subscriptionStatus: 'expired' },
      }).catch(() => {});

      return { success: false, response: NextResponse.json({
        error: 'subscription_expired',
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'La période d\'essai est terminée. Veuillez contacter le support Codex au 0606060606 pour activer votre abonnement.',
        supportPhone: '0606060606',
      }, { status: 403 }) };
    }

    return {
      success: true,
      auth: {
        userId: user.id,
        userEmail: user.email,
        userName: user.fullName,
        userRole: user.role,
        centreId: centre.id,
        centreName: centre.name,
        centreLogoUrl: centre.logoUrl,
      },
    };
  } catch {
    return { success: false, response: NextResponse.json({ error: 'server_error', code: 'SERVER_ERROR' }, { status: 500 }) };
  }
}
