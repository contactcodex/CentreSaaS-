import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { centreId } = auth.auth;

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const calculate = searchParams.get('calculate') === 'true';

    if (calculate) {
      const tWhere: Record<string, unknown> = { centreId, status: 'active' };
      if (teacherId) tWhere.id = teacherId;
      const teachers = await db.teacher.findMany({ where: tWhere, include: { subjects: { include: { subject: true } } }, orderBy: { createdAt: 'desc' } });
      const calcMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const calcYear = year ? parseInt(year) : new Date().getFullYear();
      return NextResponse.json(teachers.map(t => ({ teacherId: t.id, teacherName: t.fullName, teacherPhone: t.phone, teacherPercentage: t.percentage || 0, totalStudents: 0, totalCollected: 0, teacherShare: 0, groups: [], studentDetails: [] })));
    }

    const where: Record<string, unknown> = { teacher: { centreId } };
    if (teacherId) where.teacherId = teacherId;
    if (month) where.month = month;
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const payments = await db.teacherPayment.findMany({ where, include: { teacher: { include: { subjects: { include: { subject: true } } } } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(payments);
  } catch (error) { return NextResponse.json({ error: 'Failed to fetch teacher payments' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const body = await request.json();
    const teacher = await db.teacher.findFirst({ where: { id: body.teacherId, centreId: auth.auth.centreId } });
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    const payment = await db.teacherPayment.create({ data: { teacherId: body.teacherId, amount: body.amount, month: body.month, year: body.year, paymentDate: body.paymentDate ? new Date(body.paymentDate) : null, notes: body.notes, status: body.status || 'pending' }, include: { teacher: { include: { subjects: { include: { subject: true } } } } } });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Failed to create teacher payment' }, { status: 500 }); }
}
