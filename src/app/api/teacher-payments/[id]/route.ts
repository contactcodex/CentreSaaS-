import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const payment = await db.teacherPayment.findFirst({ where: { id, teacher: { centreId: auth.auth.centreId } }, include: { teacher: true } });
    if (!payment) return NextResponse.json({ error: 'Teacher payment not found' }, { status: 404 });
    return NextResponse.json(payment);
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const existing = await db.teacherPayment.findFirst({ where: { id, teacher: { centreId: auth.auth.centreId } } });
    if (!existing) return NextResponse.json({ error: 'Teacher payment not found' }, { status: 404 });
    const body = await request.json();
    const payment = await db.teacherPayment.update({ where: { id }, data: { amount: body.amount, month: body.month, year: body.year, paymentDate: body.paymentDate ? new Date(body.paymentDate) : null, notes: body.notes, status: body.status }, include: { teacher: true } });
    return NextResponse.json(payment);
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const existing = await db.teacherPayment.findFirst({ where: { id, teacher: { centreId: auth.auth.centreId } } });
    if (!existing) return NextResponse.json({ error: 'Teacher payment not found' }, { status: 404 });
    await db.teacherPayment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
