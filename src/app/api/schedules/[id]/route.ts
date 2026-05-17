import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const schedule = await db.schedule.findFirst({ where: { id, subject: { service: { centreId: auth.auth.centreId } } }, include: { subject: { include: { service: true } }, teacher: true, classroom: true, level: true } });
    if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    return NextResponse.json(schedule);
  } catch (error) { return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const existing = await db.schedule.findFirst({ where: { id, subject: { service: { centreId: auth.auth.centreId } } } });
    if (!existing) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    const body = await request.json();
    const schedule = await db.schedule.update({ where: { id }, data: { subjectId: body.subjectId, teacherId: body.teacherId, classroomId: body.classroomId, levelId: body.levelId, dayOfWeek: body.dayOfWeek, startTime: body.startTime, endTime: body.endTime, group: body.group, sessionType: body.sessionType, isRecurring: body.isRecurring, trialDate: body.sessionType === 'trial' && body.trialDate ? new Date(body.trialDate) : null }, include: { subject: { include: { service: true } }, teacher: true, classroom: true, level: true } });
    return NextResponse.json(schedule);
  } catch (error) { return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const existing = await db.schedule.findFirst({ where: { id, subject: { service: { centreId: auth.auth.centreId } } } });
    if (!existing) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    await db.schedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 }); }
}
