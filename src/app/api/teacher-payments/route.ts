import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: get next month number and year (handles year boundary)
function getNextMonth(month: number, year: number): { month: number; year: number } {
  if (month === 12) return { month: 1, year: year + 1 };
  return { month: month + 1, year };
}

// Helper: add N months to a given month/year (handles year boundaries)
function addMonths(month: number, year: number, n: number): { month: number; year: number } {
  let m = month;
  let y = year;
  for (let i = 0; i < n; i++) {
    const next = getNextMonth(m, y);
    m = next.month;
    y = next.year;
  }
  return { month: m, year: y };
}

// Helper: check if two month/year pairs are equal
function isSameMonth(a: { month: number; year: number }, b: { month: number; year: number }): boolean {
  return a.month === b.month && a.year === b.year;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const calculate = searchParams.get('calculate') === 'true';

    // Calculation mode: return auto-calculation data for teachers
    if (calculate) {
      const specificTeacherId = teacherId;

      // ─────────────────────────────────────────────────────────
      // NEW APPROACH: Use StudentLevel records (per-subject enrollment)
      // instead of Student.teacherId (single teacher field)
      // ─────────────────────────────────────────────────────────

      // Fetch all StudentLevel records with their teacher, level, subject, and student info
      // This gives us the true per-subject teacher assignments
      const enrollmentsWhere: Record<string, unknown> = {
        student: { status: 'active' },
        teacherId: { not: null }, // Only enrollments with assigned teachers
      };
      if (specificTeacherId) {
        enrollmentsWhere.teacherId = specificTeacherId;
      }

      const studentLevels = await db.studentLevel.findMany({
        where: Object.keys(enrollmentsWhere).length > 0 ? enrollmentsWhere : undefined,
        include: {
          student: {
            select: { id: true, fullName: true, status: true },
          },
          level: {
            include: {
              subject: { include: { service: true } },
            },
          },
          teacher: true,
        },
      });

      // Fetch all active teachers (or specific one)
      const teacherWhere: Record<string, unknown> = { status: 'active' };
      if (specificTeacherId) {
        teacherWhere.id = specificTeacherId;
      }

      const teachers = await db.teacher.findMany({
        where: Object.keys(teacherWhere).length > 0 ? teacherWhere : undefined,
        include: {
          subjects: {
            include: {
              subject: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // The month/year being calculated (from form selection)
      const calcMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const calcYear = year ? parseInt(year) : new Date().getFullYear();

      // =============================================
      // ALGORITHM (UPDATED for multi-subject enrollments):
      //
      // 1. Get all StudentLevel records (enrollments) for each teacher
      // 2. For each enrollment, get the monthlyFee (per-subject fee)
      // 3. For each student, calculate their total monthly payment contribution
      //    from the Payment table (same pack-based logic as before)
      // 4. If a student has enrollments with MULTIPLE teachers, split the
      //    contribution proportionally based on each enrollment's monthlyFee
      //    e.g., Math 250dh (Nabil) + Physics 250dh (Hamid) = 500dh total
      //    If student paid 500dh, Nabil gets 250dh and Hamid gets 250dh
      // 5. Calculate teacher share = totalCollected * percentage / 100
      // =============================================

      // Get unique student IDs from all relevant enrollments
      const uniqueStudentIds = [...new Set(studentLevels.map((sl) => sl.studentId))];

      // Fetch ALL payments for these students
      const studentPayments = uniqueStudentIds.length > 0
        ? await db.payment.findMany({
            where: {
              studentId: { in: uniqueStudentIds },
              status: { in: ['paid', 'partial'] },
              paidAmount: { gt: 0 },
            },
          })
        : [];

      // Build map: studentId → total monthly contribution for calcMonth
      // This is the TOTAL amount the student contributes this month
      // (will be split among teachers later)
      const monthlyContributionByStudent = new Map<string, number>();

      for (const p of studentPayments) {
        const pDate = p.paymentDate ? new Date(p.paymentDate) : null;
        if (!pDate) continue;

        const packMonths = p.packMonths || 1;
        const monthlyAmount = (p.paidAmount || 0) / packMonths;

        const payMonth = pDate.getMonth() + 1;
        const payYear = pDate.getFullYear();
        const payDay = pDate.getDate();

        let effectiveStart: { month: number; year: number };
        if (payDay >= 1 && payDay <= 15) {
          effectiveStart = { month: payMonth, year: payYear };
        } else {
          effectiveStart = getNextMonth(payMonth, payYear);
        }

        for (let i = 0; i < packMonths; i++) {
          const coveredMonth = addMonths(effectiveStart.month, effectiveStart.year, i);
          if (isSameMonth(coveredMonth, { month: calcMonth, year: calcYear })) {
            const existing = monthlyContributionByStudent.get(p.studentId) || 0;
            monthlyContributionByStudent.set(p.studentId, existing + monthlyAmount);
            break;
          }
        }
      }

      // Build a map: studentId → total monthlyFee across ALL their enrollments
      // This is used to calculate the proportional split for multi-teacher students
      const totalFeeByStudent = new Map<string, number>();
      for (const sl of studentLevels) {
        const fee = sl.monthlyFee || 0;
        if (fee > 0) {
          const existing = totalFeeByStudent.get(sl.studentId) || 0;
          totalFeeByStudent.set(sl.studentId, existing + fee);
        }
      }

      // Group enrollments by teacherId
      const enrollmentsByTeacher = new Map<string, typeof studentLevels>();
      for (const sl of studentLevels) {
        if (!sl.teacherId) continue;
        const arr = enrollmentsByTeacher.get(sl.teacherId) || [];
        arr.push(sl);
        enrollmentsByTeacher.set(sl.teacherId, arr);
      }

      // Calculate data for each teacher
      const calculations = teachers.map((teacher) => {
        const teacherEnrollments = enrollmentsByTeacher.get(teacher.id) || [];

        // Get unique students for this teacher (from their enrollments)
        const uniqueStudentIdsForTeacher = [...new Set(teacherEnrollments.map((sl) => sl.studentId))];
        const totalStudents = uniqueStudentIdsForTeacher.length;

        // For each student enrolled with this teacher, calculate their contribution
        // If the student has enrollments with multiple teachers, split proportionally
        let totalCollected = 0;

        const groupsMap = new Map<
          string,
          {
            groupName: string;
            subjectName: string;
            subjectNameAr: string;
            levelName: string;
            levelNameAr: string;
            studentCount: number;
            collected: number;
          }
        >();

        const studentDetails: {
          studentId: string;
          studentName: string;
          levelNameAr: string;
          subjectNameAr: string;
          monthlyAmount: number;
          paid: boolean;
        }[] = [];

        for (const sl of teacherEnrollments) {
          const studentTotalContribution = monthlyContributionByStudent.get(sl.studentId) || 0;
          const studentTotalFee = totalFeeByStudent.get(sl.studentId) || 0;
          const enrollmentFee = sl.monthlyFee || 0;

          // Calculate this enrollment's share of the student's payment
          let enrollmentContribution = 0;
          if (studentTotalFee > 0 && enrollmentFee > 0) {
            // Proportional split: this enrollment's fee / total fees * total contribution
            enrollmentContribution = (enrollmentFee / studentTotalFee) * studentTotalContribution;
          } else if (studentTotalFee === 0 && studentTotalContribution > 0) {
            // No fee breakdown available, equal split among all teachers
            // Count how many different teachers this student has
            const teachersForStudent = [...new Set(
              studentLevels.filter((s) => s.studentId === sl.studentId && s.teacherId).map((s) => s.teacherId)
            )].length;
            enrollmentContribution = studentTotalContribution / teachersForStudent;
          }

          totalCollected += enrollmentContribution;

          // Update groups
          if (sl.level) {
            const key = sl.level.id;
            const contribution = Math.round(enrollmentContribution * 100) / 100;
            const existing = groupsMap.get(key);
            if (existing) {
              existing.studentCount += 1;
              existing.collected += contribution;
            } else {
              groupsMap.set(key, {
                groupName: `${sl.level.subject.name} - ${sl.level.name}`,
                subjectName: sl.level.subject.name,
                subjectNameAr: sl.level.subject.nameAr || sl.level.subject.name,
                levelName: sl.level.name,
                levelNameAr: sl.level.nameAr || sl.level.name,
                studentCount: 1,
                collected: contribution,
              });
            }
          }

          // Add to student details (one entry per enrollment)
          studentDetails.push({
            studentId: sl.studentId,
            studentName: sl.student.fullName,
            levelNameAr: sl.level?.nameAr || '—',
            subjectNameAr: sl.level?.subject?.nameAr || '—',
            monthlyAmount: Math.round(enrollmentContribution * 100) / 100,
            paid: enrollmentContribution > 0,
          });
        }

        // Deduplicate student count in groups (a student might appear in same group from different logic paths)
        // Actually, each enrollment is unique, so each student appears once per group
        // But for totalStudents, we want unique student count
        const groups = Array.from(groupsMap.values());

        // Sort student details
        studentDetails.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

        // Teacher share calculation
        const percentage = teacher.percentage || 0;
        const teacherShare = (totalCollected * percentage) / 100;

        return {
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          teacherPhone: teacher.phone,
          teacherPercentage: percentage,
          totalStudents,
          totalCollected: Math.round(totalCollected * 100) / 100,
          teacherShare: Math.round(teacherShare * 100) / 100,
          groups,
          studentDetails,
        };
      });

      return NextResponse.json(calculations);
    }

    // Normal mode: return teacher payments list
    const where: Record<string, unknown> = {};

    if (teacherId) {
      where.teacherId = teacherId;
    }
    if (month) {
      where.month = month;
    }
    if (year) {
      where.year = parseInt(year);
    }
    if (status) {
      where.status = status;
    }

    const teacherPayments = await db.teacherPayment.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        teacher: {
          include: {
            subjects: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(teacherPayments);
  } catch (error) {
    console.error('Error fetching teacher payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const teacherPayment = await db.teacherPayment.create({
      data: {
        teacherId: body.teacherId,
        amount: body.amount,
        month: body.month,
        year: body.year,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        notes: body.notes,
        status: body.status || 'pending',
      },
      include: {
        teacher: {
          include: {
            subjects: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(teacherPayment, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher payment:', error);
    return NextResponse.json(
      { error: 'Failed to create teacher payment' },
      { status: 500 }
    );
  }
}
