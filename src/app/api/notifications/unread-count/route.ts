import { NextRequest, NextResponse } from 'next/server';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    return NextResponse.json({ unreadCount: 0 });
  } catch { return NextResponse.json({ unreadCount: 0 }); }
}
