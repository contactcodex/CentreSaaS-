import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const packDiscount = await db.packDiscount.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr }),
        ...(body.nameFr !== undefined && { nameFr: body.nameFr }),
        ...(body.months !== undefined && { months: body.months }),
        ...(body.discountPercent !== undefined && { discountPercent: body.discountPercent }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });
    return NextResponse.json(packDiscount);
  } catch (error) {
    console.error('Error updating pack discount:', error);
    return NextResponse.json({ error: 'Failed to update pack discount' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Clear references before deleting
    await db.payment.updateMany({
      where: { packDiscountId: id },
      data: { packDiscountId: null },
    });
    await db.packDiscount.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pack discount:', error);
    return NextResponse.json({ error: 'Failed to delete pack discount' }, { status: 500 });
  }
}
