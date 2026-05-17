import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { st } from '@/lib/server-t';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: st('unauthorized') }, { status: 401 });
    }

    // Find session
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: st('sessionExpired') }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role,
        accessPages: session.user.accessPages,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: st('sessionError') }, { status: 500 });
  }
}
