import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { st } from '@/lib/server-t';

export async function GET() {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: st('unauthorized') }, { status: 401 });

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user.centreId) {
      return NextResponse.json({ error: st('unauthorized') }, { status: 401 });
    }

    const centre = await db.centre.findUnique({
      where: { id: session.user.centreId },
      select: { name: true, logoUrl: true, contactWhatsapp: true },
    });

    return NextResponse.json(centre || { name: 'Codex Centre', logoUrl: null });
  } catch (error) {
    console.error('Centre info error:', error);
    return NextResponse.json({ error: st('fetchError') }, { status: 500 });
  }
}
