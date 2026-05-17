import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { id } = await params;
    const payment = await db.payment.findFirst({
      where: { id, student: { centreId: auth.auth.centreId } },
      include: {
        student: {
          include: {
            level: { include: { subject: { include: { service: true } } } },
            teacher: true,
          },
        },
        promotion: true,
        packDiscount: true,
      },
    });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.payment.findFirst({ where: { id, student: { centreId: auth.auth.centreId } } });
    if (!existing) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const payment = await db.payment.update({
      where: { id },
      data: {
        amount: body.amount, paidAmount: body.paidAmount, remainingAmount: body.remainingAmount,
        month: body.month, year: body.year,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        discount: body.discount || 0, discountReason: body.discountReason || null,
        packMonths: body.packMonths || 1, method: body.method, notes: body.notes,
        status: body.status, promotionId: body.promotionId || null, packDiscountId: body.packDiscountId || null,
      },
      include: {
        student: { include: { level: { include: { subject: { include: { service: true } } } }, teacher: true } },
        promotion: true, packDiscount: true,
      },
    });
    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { id } = await params;
    const existing = await db.payment.findFirst({ where: { id, student: { centreId: auth.auth.centreId } } });
    if (!existing) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    await db.payment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
