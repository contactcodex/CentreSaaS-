import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { st } from '@/lib/server-t';

export async function POST(request: NextRequest) {
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

    // Check if this is a remove request (JSON body)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.remove) {
        await db.centre.update({
          where: { id: centreId },
          data: { logoUrl: null },
        });
        // Return current centre info including name from settings
        const centerNameSetting = await db.setting.findUnique({ where: { key: 'center_name' } });
        const centre = await db.centre.findUnique({ where: { id: centreId }, select: { name: true, contactWhatsapp: true } });
        return NextResponse.json({
          logoUrl: null,
          name: centerNameSetting?.value || centre?.name || '',
          contactWhatsapp: centre?.contactWhatsapp || null,
        });
      }
    }

    // Otherwise, handle file upload
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const logoUrl = `data:${file.type};base64,${base64}`;

    await db.centre.update({
      where: { id: centreId },
      data: { logoUrl },
    });

    // Return current centre info including name from settings
    const centerNameSetting = await db.setting.findUnique({ where: { key: 'center_name' } });
    const centre = await db.centre.findUnique({ where: { id: centreId }, select: { name: true, contactWhatsapp: true } });

    return NextResponse.json({
      logoUrl,
      name: centerNameSetting?.value || centre?.name || '',
      contactWhatsapp: centre?.contactWhatsapp || null,
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: st('saveError') }, { status: 500 });
  }
}
