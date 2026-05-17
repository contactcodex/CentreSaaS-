import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { st } from '@/lib/server-t';

const SALT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: st('emailPasswordRequired') }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { centre: true },
    });

    if (!user) {
      return NextResponse.json({ error: st('invalidCredentials') }, { status: 401 });
    }

    let passwordValid = false;
    if (user.password.startsWith('$2')) {
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      passwordValid = user.password === password;
      if (passwordValid) {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        await db.user.update({ where: { id: user.id }, data: { password: hash } });
      }
    }

    if (!passwordValid) {
      return NextResponse.json({ error: st('invalidCredentials') }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: st('accountDisabled') }, { status: 403 });
    }

    // ── Check centre subscription BEFORE creating session ──────────────────
    if (user.role !== 'SUPER_ADMIN' && user.centre) {
      const centre = user.centre;

      if (!centre.isActive) {
        return NextResponse.json({
          error: 'centre_disabled',
          code: 'CENTRE_DISABLED',
          message: 'Your centre has been disabled. Please contact support.',
        }, { status: 403 });
      }

      // Start subscription timer on FIRST LOGIN if not started
      const status = centre.subscriptionStatus;
      const pack = centre.subscriptionPack;

      if (status === 'none' || status === 'expired') {
        return NextResponse.json({
          error: 'subscription_expired',
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'La période d\'essai est terminée. Veuillez contacter le support Codex au 0606060606 pour activer votre abonnement.',
          supportPhone: '0606060606',
        }, { status: 403 });
      }

      // Start timer on first login
      if (!centre.subscriptionStart && status !== 'none' && status !== 'expired' && status !== 'unlimited') {
        const durationMs = getDurationMs(status, pack);
        if (durationMs) {
          const now = new Date();
          const end = new Date(now.getTime() + durationMs);
          await db.centre.update({
            where: { id: centre.id },
            data: { subscriptionStart: now, subscriptionEnd: end },
          });
        }
      }

      // Check expiry
      if (centre.subscriptionEnd && new Date() > centre.subscriptionEnd && status !== 'unlimited') {
        await db.centre.update({
          where: { id: centre.id },
          data: { subscriptionStatus: 'expired' },
        }).catch(() => {});

        return NextResponse.json({
          error: 'subscription_expired',
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'La période d\'essai est terminée. Veuillez contacter le support Codex au 0606060606 pour activer votre abonnement.',
          supportPhone: '0606060606',
        }, { status: 403 });
      }
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.session.create({
      data: { token, userId: user.id, expiresAt },
    });

    const responseData: Record<string, unknown> = {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accessPages: user.accessPages,
      },
      token,
    };

    // Include centre subscription info for ADMIN users
    if (user.role !== 'SUPER_ADMIN' && user.centre) {
      // Re-read centre to get updated subscription info
      const freshCentre = await db.centre.findUnique({
        where: { id: user.centreId! },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          contactWhatsapp: true,
          subscriptionStatus: true,
          subscriptionPack: true,
          subscriptionStart: true,
          subscriptionEnd: true,
          isActive: true,
        },
      });
      responseData.centre = freshCentre;
    }

    const response = NextResponse.json(responseData);

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: st('loginError') }, { status: 500 });
  }
}

// Duration map
function getDurationMs(status: string, pack: string): number | null {
  const map: Record<string, number> = {
    trial_1min: 60 * 1000,
    trial_24h: 24 * 60 * 60 * 1000,
    trial_7d: 7 * 24 * 60 * 60 * 1000,
  };
  const packMap: Record<string, number> = {
    '1month': 30 * 24 * 60 * 60 * 1000,
    '1year': 365 * 24 * 60 * 60 * 1000,
  };
  if (map[status]) return map[status];
  if (status === 'active' && packMap[pack]) return packMap[pack];
  return null;
}
