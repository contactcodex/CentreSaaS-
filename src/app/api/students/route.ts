import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { centreId } = auth.auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { centreId };
    if (search) where.OR = [{ fullName: { contains: search } }, { phone: { contains: search } }];
    if (status) where.status = status;

    const students = await db.student.findMany({
      where,
      include: {
        level: { include: { subject: { include: { service: true } } } },
        teacher: true,
        enrollments: { include: { level: { include: { subject: { include: { service: true } } } }, teacher: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const currentYM = now.getFullYear() * 12 + now.getMonth();

    const enrichedStudents = students.map((student) => {
      const payments = student.payments;
      let isPackPaid = false;
      let nextDueDate: string | null = null;

      if (payments.length > 0) {
        let latestPayment: typeof payments[0] | null = null;
        let latestDate: Date | null = null;
        for (const p of payments) {
          const pDate = p.paymentDate ? (p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate)) : new Date(p.year, ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(p.month), 1);
          if (!latestDate || pDate >= latestDate) { latestDate = pDate; latestPayment = p; }
        }
        if (latestPayment && latestDate) {
          const dueDate = new Date(latestDate); dueDate.setMonth(dueDate.getMonth() + (latestPayment.packMonths || 1));
          nextDueDate = `${String(dueDate.getDate()).padStart(2,'0')}/${String(dueDate.getMonth()+1).padStart(2,'0')}/${dueDate.getFullYear()}`;
        }
        for (const p of payments) {
          if (p.remainingAmount === 0) {
            let pStartDate = p.paymentDate ? (p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate)) : new Date(p.year, ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(p.month), 1);
            const pDueDate = new Date(pStartDate); pDueDate.setMonth(pDueDate.getMonth() + (p.packMonths || 1));
            const psYM = pStartDate.getFullYear() * 12 + pStartDate.getMonth();
            const pdYM = pDueDate.getFullYear() * 12 + pDueDate.getMonth();
            if (psYM <= currentYM && currentYM < pdYM) { isPackPaid = true; break; }
          }
        }
      }
      const { payments: _p, ...rest } = student;
      return { ...rest, enrollments: student.enrollments, isPackPaid, nextDueDate };
    });

    return NextResponse.json(enrichedStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const body = await request.json();
    const enrollments = body.enrollments || [];
    const firstEnrollment = enrollments[0] || {};
    const totalFee = enrollments.reduce((sum: number, e: { monthlyFee?: number }) => sum + (e.monthlyFee || 0), 0);
    const student = await db.student.create({
      data: {
        fullName: body.fullName, phone: body.phone, email: body.email, address: body.address,
        levelId: firstEnrollment.levelId || null, teacherId: firstEnrollment.teacherId || null,
        parentName: body.parentName, parentPhone: body.parentPhone, monthlyFee: totalFee,
        packMonths: body.packMonths ?? 1, status: body.status || 'active',
        enrollmentDate: body.enrollmentDate ? new Date(body.enrollmentDate) : new Date(),
        centreId: auth.auth.centreId,
        enrollments: { create: enrollments.map((e: { levelId: string; teacherId?: string | null; monthlyFee?: number }) => ({ levelId: e.levelId, teacherId: e.teacherId || null, monthlyFee: e.monthlyFee ?? 0 })) },
      },
      include: { level: { include: { subject: { include: { service: true } } } }, teacher: true, enrollments: { include: { level: { include: { subject: { include: { service: true } } } }, teacher: true } } },
    });
    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
