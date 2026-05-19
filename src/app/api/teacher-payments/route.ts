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
      const teachers = await db.teacher.findMany({
        where: tWhere,
        include: {
          subjects: { include: { subject: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const calcMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const calcYear = year ? parseInt(year) : new Date().getFullYear();

      // Build calculation data for each teacher
      const results = await Promise.all(
        teachers.map(async (t) => {
          const baseSalary = t.salary || 250; // Default 250dh if not set
          const percentage = t.percentage || 0;

          // Get students assigned to this teacher
          const students = await db.student.findMany({
            where: {
              teacherId: t.id,
              centreId,
              status: 'active',
            },
            include: {
              level: { include: { subject: true } },
            },
          });

          // Get payments for these students in the selected month/year
          const studentIds = students.map((s) => s.id);
          let totalCollected = 0;
          const studentDetails: { studentId: string; studentName: string; levelNameAr: string; subjectNameAr: string; monthlyAmount: number; paid: boolean }[] = [];

          if (studentIds.length > 0) {
            const payments = await db.payment.findMany({
              where: {
                studentId: { in: studentIds },
                month: String(calcMonth),
                year: calcYear,
              },
            });

            const paidPayments = payments.filter((p) => p.status === 'paid');
            totalCollected = paidPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

            // Build student details
            for (const s of students) {
              const studentPayment = payments.find((p) => p.studentId === s.id);
              const monthlyAmount = studentPayment?.amount || 0;
              const paid = !!studentPayment && studentPayment.status === 'paid';
              studentDetails.push({
                studentId: s.id,
                studentName: s.fullName,
                levelNameAr: s.level?.nameAr || '',
                subjectNameAr: s.level?.subject?.nameAr || '',
                monthlyAmount,
                paid,
              });
            }
          }

          // Teacher share = base salary × percentage / 100
          const teacherShare = percentage > 0 ? Math.round((baseSalary * percentage) / 100 * 100) / 100 : baseSalary;

          // Group by subject/level
          const groupMap = new Map<string, { groupName: string; subjectNameAr: string; levelNameAr: string; studentCount: number }>();
          for (const s of students) {
            const key = `${s.level?.subject?.nameAr || ''}-${s.level?.nameAr || ''}`;
            if (!groupMap.has(key)) {
              groupMap.set(key, {
                groupName: key,
                subjectNameAr: s.level?.subject?.nameAr || '',
                levelNameAr: s.level?.nameAr || '',
                studentCount: 0,
              });
            }
            groupMap.get(key)!.studentCount += 1;
          }

          return {
            teacherId: t.id,
            teacherName: t.fullName,
            teacherPhone: t.phone || undefined,
            teacherPercentage: percentage,
            baseSalary,
            totalStudents: students.length,
            totalCollected,
            teacherShare,
            groups: Array.from(groupMap.values()),
            studentDetails,
          };
        })
      );

      return NextResponse.json(results);
    }

    const where: Record<string, unknown> = { teacher: { centreId } };
    if (teacherId) where.teacherId = teacherId;
    if (month) where.month = month;
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const payments = await db.teacherPayment.findMany({
      where,
      include: { teacher: { include: { subjects: { include: { subject: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Teacher payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch teacher payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const body = await request.json();
    const teacher = await db.teacher.findFirst({ where: { id: body.teacherId, centreId: auth.auth.centreId } });
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    const payment = await db.teacherPayment.create({
      data: {
        teacherId: body.teacherId,
        amount: body.amount,
        month: body.month,
        year: body.year,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        notes: body.notes,
        status: body.status || 'pending',
      },
      include: { teacher: { include: { subjects: { include: { subject: true } } } } },
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Create teacher payment error:', error);
    return NextResponse.json({ error: 'Failed to create teacher payment' }, { status: 500 });
  }
}
