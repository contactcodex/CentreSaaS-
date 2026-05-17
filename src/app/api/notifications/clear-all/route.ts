import { NextRequest, NextResponse } from 'next/server';
import { getCentreAuth } from '@/lib/centre-auth';

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    return NextResponse.json({ success: true, deleted: 0 });
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
