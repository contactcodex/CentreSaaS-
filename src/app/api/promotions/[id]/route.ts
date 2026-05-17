import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const promotion = await db.promotion.findFirst({
      where: { id, centreId: auth.auth.centreId },
      include: { payments: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!promotion) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    return NextResponse.json(promotion);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch promotion' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const existing = await db.promotion.findFirst({ where: { id, centreId: auth.auth.centreId } });
    if (!existing) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    const body = await request.json();
    const promotion = await db.promotion.update({
      where: { id },
      data: { name: body.name, nameAr: body.nameAr, nameFr: body.nameFr, type: body.type, value: body.value, color: body.color, icon: body.icon, active: body.active },
    });
    return NextResponse.json(promotion);
  } catch {
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const existing = await db.promotion.findFirst({ where: { id, centreId: auth.auth.centreId } });
    if (!existing) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    await db.promotion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
