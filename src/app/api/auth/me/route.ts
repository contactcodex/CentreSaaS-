import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { st } from '@/lib/server-t';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: st('unauthorized') }, { status: 401 });
    }

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: st('sessionExpired') }, { status: 401 });
    }

    const userData: Record<string, unknown> = {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      accessPages: session.user.accessPages,
    };

    // Include centre subscription info for ADMIN users
    if (session.user.role !== 'SUPER_ADMIN' && session.user.centreId) {
      const centre = await db.centre.findUnique({
        where: { id: session.user.centreId },
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
      userData.centre = centre;
    }

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: st('sessionError') }, { status: 500 });
  }
}
