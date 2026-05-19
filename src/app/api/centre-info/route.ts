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

    const centreId = session.user.centreId;

    const [centre, settings] = await Promise.all([
      db.centre.findUnique({
        where: { id: centreId },
        select: { name: true, logoUrl: true, contactWhatsapp: true },
      }),
      db.setting.findMany({ where: { key: { in: ['center_name', 'center_phone', 'center_address'] } } }),
    ]);

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // Prefer center_name from settings, fall back to Centre.name
    const name = settingsMap.center_name || centre?.name || '';

    return NextResponse.json({
      name,
      logoUrl: centre?.logoUrl || null,
      contactWhatsapp: centre?.contactWhatsapp || null,
      center_phone: settingsMap.center_phone || null,
      center_address: settingsMap.center_address || null,
    });
  } catch (error) {
    console.error('Centre info error:', error);
    return NextResponse.json({ error: st('fetchError') }, { status: 500 });
  }
}
