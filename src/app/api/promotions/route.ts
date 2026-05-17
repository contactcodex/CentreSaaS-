import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { centreId } = auth.auth;

    const promotions = await db.promotion.findMany({
      where: { active: true, centreId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const body = await request.json();
    const promotion = await db.promotion.create({
      data: {
        name: body.name,
        nameAr: body.nameAr || body.name,
        nameFr: body.nameFr || body.name,
        type: body.type || 'badge',
        value: body.value || 0,
        color: body.color || '#6366f1',
        icon: body.icon || 'Tag',
        active: body.active !== false,
        centreId: auth.auth.centreId,
      },
    });
    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}
