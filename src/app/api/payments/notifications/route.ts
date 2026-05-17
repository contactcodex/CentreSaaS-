import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { centreId } = auth.auth;

    const now = new Date();
    const currentMonthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][now.getMonth()];
    const currentYear = now.getFullYear();

    const students = await db.student.findMany({
      where: { status: 'active', centreId },
      include: { level: { include: { subject: { include: { service: true } } } }, teacher: true, payments: { orderBy: { createdAt: 'desc' } } },
    });

    const unpaidThisMonth = students.filter(s => !s.payments.some(p => p.month === currentMonthName && p.year === currentYear && (p.status === 'paid' || p.paidAmount >= (p.amount - (p.discount || 0))))).map(s => ({
      studentId: s.id, studentName: s.fullName, phone: s.phone, parentPhone: s.parentPhone, parentName: s.parentName,
      monthlyFee: s.monthlyFee, service: s.level?.subject?.service?.nameAr || '', level: s.level?.nameAr || '', teacher: s.teacher?.fullName || '',
      enrollmentDate: s.enrollmentDate.toISOString().split('T')[0],
    }));

    return NextResponse.json({ unpaidThisMonth, overdueStudents: [], totalCount: unpaidThisMonth.length, overdueCount: 0 });
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
