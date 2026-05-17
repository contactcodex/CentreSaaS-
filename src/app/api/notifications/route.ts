import { NextRequest, NextResponse } from 'next/server';
import { getCentreAuth } from '@/lib/centre-auth';

// GET /api/notifications — List all notifications (unread first)
export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    // Notifications don't have centreId, return empty for now
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications — Generate notifications
export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const body = await request.json().catch(() => ({}));
    const action = body.action as string | undefined;

    if (action === 'generate') {
      return NextResponse.json({ success: true, generated: 0, totalUnread: 0, totalChecked: 0 });
    }

    if (action === 'mark-all-read') {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST notifications:', error);
    return NextResponse.json({ error: 'Failed to process notification request' }, { status: 500 });
  }
}
