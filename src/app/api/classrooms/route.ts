import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { centreId } = auth.auth;

    const classrooms = await db.classroom.findMany({
      where: { centreId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(classrooms);
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const body = await request.json();
    const classroom = await db.classroom.create({
      data: { name: body.name, nameAr: body.nameAr, capacity: body.capacity || 20, centreId: auth.auth.centreId },
    });
    return NextResponse.json(classroom, { status: 201 });
  } catch (error) {
    console.error('Error creating classroom:', error);
    return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
  }
}
