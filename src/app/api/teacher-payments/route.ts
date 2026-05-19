import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

// Map month number (1-12) to English month name as stored in Payment.month
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function getMonthName(num: number): string {
  return MONTH_NAMES[(num - 1 + 12) % 12] || MONTH_NAMES[0];
}

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
        include: { subjects: { include: { subject: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const calcMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const calcYear = year ? parseInt(year) : new Date().getFullYear();
      const calcMonthName = getMonthName(calcMonth);
      const prevMonth = calcMonth === 1 ? 12 : calcMonth - 1;
      const prevYear = calcMonth === 1 ? calcYear - 1 : calcYear;
      const prevMonthName = getMonthName(prevMonth);

      // For each teacher, find students via StudentLevel, then their payments
      const results = await Promise.all(
        teachers.map(async (t) => {
          const percentage = t.percentage || 0;

          // Get all student enrollments for this teacher via StudentLevel
          const studentLevels = await db.studentLevel.findMany({
            where: {
              teacherId: t.id,
              student: { centreId, status: 'active' },
            },
            include: {
              student: true,
              level: { include: { subject: true } },
            },
          });

          // Get all student IDs for this teacher (unique)
          const allStudentIds = [...new Set(studentLevels.map((sl) => sl.studentId))];

          // Build fee ratio per enrollment: each enrollment fee / total fees for student
          // This ratio determines how much of a student's payment goes to this teacher
          const studentFeeMap = new Map<string, number>(); // studentId -> teacher's share ratio

          if (allStudentIds.length > 0) {
            // Get ALL enrollments for these students (not just this teacher's)
            const allEnrollments = await db.studentLevel.findMany({
              where: { studentId: { in: allStudentIds } },
              include: { level: { include: { subject: true } }, teacher: true },
            });

            for (const sl of studentLevels) {
              const sid = sl.studentId;
              const fee = sl.monthlyFee || 0;
              const studentEnrollments = allEnrollments.filter((e) => e.studentId === sid);
              const totalStudentFee = studentEnrollments.reduce((s, e) => s + (e.monthlyFee || 0), 0);
              const ratio = totalStudentFee > 0 ? fee / totalStudentFee : 0;
              studentFeeMap.set(sid, ratio);
            }
          }

          // Get payments for these students
          let totalCollectedForTeacher = 0;
          const studentDetails: {
            studentId: string;
            studentName: string;
            levelNameAr: string;
            subjectNameAr: string;
            monthlyAmount: number;
            paid: boolean;
            paidAmount: number;
            paidDate: string | null;
          }[] = [];

          if (allStudentIds.length > 0) {
            // Fetch payments matching the month names stored in DB
            const payments = await db.payment.findMany({
              where: {
                studentId: { in: allStudentIds },
                OR: [
                  { month: calcMonthName, year: calcYear },
                  { month: prevMonthName, year: prevYear },
                ],
              },
              orderBy: { paymentDate: 'desc' },
            });

            // Deduplicate: one payment per student per month
            const paymentByStudent = new Map<string, typeof payments[0]>();
            for (const p of payments) {
              const existing = paymentByStudent.get(p.studentId);
              if (!existing || !existing.paymentDate || (p.paymentDate && new Date(p.paymentDate) > new Date(existing.paymentDate))) {
                paymentByStudent.set(p.studentId, p);
              }
            }

            for (const sl of studentLevels) {
              const sid = sl.studentId;
              const fee = sl.monthlyFee || 0;
              const ratio = studentFeeMap.get(sid) || 0;

              const payment = paymentByStudent.get(sid) || null;

              // Apply the 16th rule using the actual payment date
              // If paid 1st-15th of calcMonth → counts for calcMonth ✓
              // If paid 16th-end of calcMonth → counts for NEXT month ✗ (skip here)
              // If paid 1st-15th of prevMonth → counts for prevMonth ✗ (skip here)
              // If paid 16th-end of prevMonth → counts for calcMonth ✓
              let countsForCalcMonth = false;
              if (payment && payment.paymentDate) {
                const pDate = new Date(payment.paymentDate);
                const pMonthNum = pDate.getMonth() + 1;
                const pYearNum = pDate.getFullYear();
                const pDay = pDate.getDate();

                if (pYearNum === calcYear && pMonthNum === calcMonth && pDay <= 15) {
                  countsForCalcMonth = true;
                } else if (pYearNum === prevYear && pMonthNum === prevMonth && pDay >= 16) {
                  countsForCalcMonth = true;
                }
              }

              // Also count if no paymentDate but month matches calcMonthName
              if (payment && !payment.paymentDate && payment.month === calcMonthName) {
                countsForCalcMonth = true;
              }

              const isPaid = countsForCalcMonth && payment && payment.status === 'paid';
              if (isPaid) {
                const paidAmount = payment.paidAmount || 0;
                const packMonths = payment.packMonths || 1;
                // For packs: divide total paid by number of months, then apply ratio
                const monthlyPaidAmount = packMonths > 1 ? Math.round(paidAmount / packMonths * 100) / 100 : paidAmount;
                const teacherPortion = Math.round(monthlyPaidAmount * ratio * 100) / 100;
                totalCollectedForTeacher += teacherPortion;
              }

              studentDetails.push({
                studentId: sid,
                studentName: sl.student.fullName,
                levelNameAr: sl.level?.nameAr || '',
                subjectNameAr: sl.level?.subject?.nameAr || '',
                monthlyAmount: fee,
                paid: isPaid,
                paidAmount: isPaid ? (() => {
                  const paidAmount = payment?.paidAmount || 0;
                  const packMonths = payment?.packMonths || 1;
                  const monthlyPaid = packMonths > 1 ? Math.round(paidAmount / packMonths * 100) / 100 : paidAmount;
                  return Math.round(monthlyPaid * ratio * 100) / 100;
                })() : 0,
                paidDate: payment?.paymentDate ? String(payment.paymentDate) : null,
              });
            }
          }

          // Teacher share = totalCollectedForTeacher × (percentage / 100)
          const teacherShare = percentage > 0
            ? Math.round(totalCollectedForTeacher * percentage / 100 * 100) / 100
            : totalCollectedForTeacher;

          // Build groups (unique subject-level combinations)
          const groupMap = new Map<string, { subjectNameAr: string; levelNameAr: string; studentCount: number }>();
          for (const sl of studentLevels) {
            const key = `${sl.level?.subject?.nameAr || ''}-${sl.level?.nameAr || ''}`;
            if (!groupMap.has(key)) {
              groupMap.set(key, {
                subjectNameAr: sl.level?.subject?.nameAr || '',
                levelNameAr: sl.level?.nameAr || '',
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
            totalStudents: allStudentIds.length,
            totalCollected: Math.round(totalCollectedForTeacher * 100) / 100,
            teacherShare,
            groups: Array.from(groupMap.values()),
            studentDetails,
          };
        })
      );

      return NextResponse.json(results);
    }

    // Regular listing
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
