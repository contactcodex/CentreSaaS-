import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { centreId } = auth.auth;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { student: { centreId } };
    if (studentId) where.studentId = studentId;
    if (month) where.month = month;
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const payments = await db.payment.findMany({
      where: Object.keys(where).length > 0 ? where : { student: { centreId } },
      include: { student: { include: { level: { include: { subject: { include: { service: true } } } }, teacher: true } }, promotion: true, packDiscount: true },
      orderBy: { paymentDate: 'desc' },
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const body = await request.json();
    // Verify student belongs to this centre
    const student = await db.student.findFirst({ where: { id: body.studentId, centreId: auth.auth.centreId } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const payment = await db.payment.create({
      data: {
        studentId: body.studentId, amount: body.amount, paidAmount: body.paidAmount || 0,
        remainingAmount: body.remainingAmount ?? body.amount - (body.discount || 0) - (body.paidAmount || 0),
        month: body.month, year: body.year,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        discount: body.discount || 0, discountReason: body.discountReason || null,
        packMonths: body.packMonths || 1, method: body.method, notes: body.notes,
        status: body.status || 'pending', promotionId: body.promotionId || null, packDiscountId: body.packDiscountId || null,
      },
      include: { student: { include: { level: { include: { subject: { include: { service: true } } } }, teacher: true } }, promotion: true, packDiscount: true },
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
