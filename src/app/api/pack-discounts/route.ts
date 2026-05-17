import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const packDiscounts = await db.packDiscount.findMany({ where: { active: true, centreId: auth.auth.centreId }, orderBy: { months: 'asc' } });
    return NextResponse.json(packDiscounts);
  } catch (error) { return NextResponse.json({ error: 'Failed to fetch pack discounts' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const body = await request.json();
    const packDiscount = await db.packDiscount.create({ data: { name: body.name, nameAr: body.nameAr || body.name, nameFr: body.nameFr || body.name, months: body.months || 1, discountPercent: body.discountPercent || 0, active: body.active !== false, centreId: auth.auth.centreId } });
    return NextResponse.json(packDiscount, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Failed to create pack discount' }, { status: 500 }); }
}
