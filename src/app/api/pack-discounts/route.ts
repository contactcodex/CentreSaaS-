import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const packDiscounts = await db.packDiscount.findMany({
      where: { active: true },
      orderBy: { months: 'asc' },
    });
    return NextResponse.json(packDiscounts);
  } catch (error) {
    console.error('Error fetching pack discounts:', error);
    return NextResponse.json({ error: 'Failed to fetch pack discounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const packDiscount = await db.packDiscount.create({
      data: {
        name: body.name,
        nameAr: body.nameAr || body.name,
        nameFr: body.nameFr || body.name,
        months: body.months || 1,
        discountPercent: body.discountPercent || 0,
        active: body.active !== false,
      },
    });
    return NextResponse.json(packDiscount, { status: 201 });
  } catch (error) {
    console.error('Error creating pack discount:', error);
    return NextResponse.json({ error: 'Failed to create pack discount' }, { status: 500 });
  }
}
