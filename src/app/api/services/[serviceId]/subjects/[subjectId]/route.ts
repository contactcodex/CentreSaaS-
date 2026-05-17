import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; subjectId: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { serviceId, subjectId } = await params;
    const body = await request.json();
    const service = await db.service.findFirst({ where: { id: serviceId, centreId: auth.auth.centreId } });
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    const existing = await db.subject.findFirst({ where: { id: subjectId, serviceId } });
    if (!existing) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

    const subject = await db.subject.update({
      where: { id: subjectId },
      data: { ...(body.name !== undefined && { name: body.name }), ...(body.nameAr !== undefined && { nameAr: body.nameAr }), ...(body.nameFr !== undefined && { nameFr: body.nameFr }) },
    });
    return NextResponse.json(subject);
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; subjectId: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { serviceId, subjectId } = await params;
    const service = await db.service.findFirst({ where: { id: serviceId, centreId: auth.auth.centreId } });
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    const existing = await db.subject.findFirst({ where: { id: subjectId, serviceId } });
    if (!existing) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

    await db.subject.delete({ where: { id: subjectId } });
    return NextResponse.json(existing);
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}
