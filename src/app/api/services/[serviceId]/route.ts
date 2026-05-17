import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { serviceId } = await params;
    const body = await request.json();
    const existing = await db.service.findFirst({ where: { id: serviceId, centreId: auth.auth.centreId } });
    if (!existing) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    const service = await db.service.update({
      where: { id: serviceId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr }),
        ...(body.nameFr !== undefined && { nameFr: body.nameFr }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });
    return NextResponse.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { serviceId } = await params;
    const existing = await db.service.findFirst({ where: { id: serviceId, centreId: auth.auth.centreId } });
    if (!existing) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    await db.service.delete({ where: { id: serviceId } });
    return NextResponse.json(existing);
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}
