import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { centreId } = auth.auth;

    const students = await db.student.findMany({
      where: { status: 'active', centreId },
      include: { level: { include: { subject: { include: { service: true } } } } },
    });

    return NextResponse.json([]);
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
