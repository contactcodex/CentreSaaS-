import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';
import { DAY_NAMES } from '@/lib/server-t';

function timeToMinutes(time: string): number { const [h, m] = time.split(':').map(Number); return h * 60 + m; }
function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean { return timeToMinutes(s1) < timeToMinutes(e2) && timeToMinutes(s2) < timeToMinutes(e1); }

interface ConflictInfo { type: 'classroom' | 'teacher'; day: string; dayLabel: string; startTime: string; endTime: string; classroomName?: string; teacherName?: string; subjectName?: string; message: string; }

async function checkConflicts(dayOfWeek: string, startTime: string, endTime: string, classroomId: string | null, teacherId: string | null, excludeId?: string): Promise<ConflictInfo[]> {
  const conflicts: ConflictInfo[] = [];
  const existing = await db.schedule.findMany({ where: { dayOfWeek, ...(excludeId ? { id: { not: excludeId } } : {}) }, include: { classroom: true, teacher: true, subject: true } });
  for (const e of existing) {
    if (!timesOverlap(startTime, endTime, e.startTime, e.endTime)) continue;
    if (classroomId && e.classroomId === classroomId) conflicts.push({ type: 'classroom', day: dayOfWeek, dayLabel: DAY_NAMES[dayOfWeek] || dayOfWeek, startTime: e.startTime, endTime: e.endTime, classroomName: e.classroom?.nameAr || e.classroom?.name, subjectName: e.subject?.nameAr || e.subject?.name, message: `هذه القاعة مشغولة في ${DAY_NAMES[dayOfWeek] || dayOfWeek} من ${e.startTime} إلى ${e.endTime}` });
    if (teacherId && e.teacherId === teacherId) conflicts.push({ type: 'teacher', day: dayOfWeek, dayLabel: DAY_NAMES[dayOfWeek] || dayOfWeek, startTime: e.startTime, endTime: e.endTime, teacherName: e.teacher?.fullName, subjectName: e.subject?.nameAr || e.subject?.name, message: `هذا الأستاذ لديه حصة في ${DAY_NAMES[dayOfWeek] || dayOfWeek} من ${e.startTime} إلى ${e.endTime}` });
  }
  return conflicts;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const dayOfWeek = searchParams.get('dayOfWeek');
    const classroomId = searchParams.get('classroomId');
    const teacherId = searchParams.get('teacherId');
    const subjectId = searchParams.get('subjectId');

    const where: Record<string, unknown> = { subject: { service: { centreId: auth.auth.centreId } } };
    if (dayOfWeek) where.dayOfWeek = dayOfWeek;
    if (classroomId) where.classroomId = classroomId;
    if (teacherId) where.teacherId = teacherId;
    if (subjectId) where.subjectId = subjectId;

    const schedules = await db.schedule.findMany({
      where, include: { subject: { include: { service: true } }, teacher: true, classroom: true, level: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return NextResponse.json(schedules);
  } catch (error) { return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const body = await request.json();
    const daysToCreate: string[] = body.isRecurring && body.daysOfWeek ? body.daysOfWeek : body.dayOfWeek ? [body.dayOfWeek] : [];
    if (daysToCreate.length === 0) return NextResponse.json({ error: 'يرجى تحديد يوم واحد على الأقل' }, { status: 400 });

    const allConflicts: ConflictInfo[] = [];
    for (const day of daysToCreate) allConflicts.push(...await checkConflicts(day, body.startTime, body.endTime, body.classroomId || null, body.teacherId || null));
    if (allConflicts.length > 0) return NextResponse.json({ error: 'conflict', message: 'يوجد تعارض في الجدول', conflicts: allConflicts }, { status: 409 });

    const scheduleData = { subjectId: body.subjectId, teacherId: body.teacherId || null, classroomId: body.classroomId || null, levelId: body.levelId || null, dayOfWeek: daysToCreate[0], startTime: body.startTime, endTime: body.endTime, group: body.group || null, sessionType: body.sessionType || 'fixed', isRecurring: body.isRecurring || false, trialDate: body.sessionType === 'trial' && body.trialDate ? new Date(body.trialDate) : null };
    const schedule = await db.schedule.create({ data: scheduleData, include: { subject: { include: { service: true } }, teacher: true, classroom: true, level: true } });

    const created = [schedule];
    if (body.isRecurring && body.daysOfWeek) {
      for (const day of body.daysOfWeek) {
        if (day !== body.dayOfWeek) created.push(await db.schedule.create({ data: { ...scheduleData, dayOfWeek: day, isRecurring: true }, include: { subject: { include: { service: true } }, teacher: true, classroom: true, level: true } }));
      }
    }
    return NextResponse.json(created.length === 1 ? schedule : created, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 }); }
}
