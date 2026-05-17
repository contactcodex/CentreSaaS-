import { NextRequest, NextResponse } from 'next/server';
import { getCentreAuth } from '@/lib/centre-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    return NextResponse.json({ success: true, totalDeleted: 0, results: [] });
  } catch (error) { return NextResponse.json({ success: false, error: String(error) }, { status: 500 }); }
}
