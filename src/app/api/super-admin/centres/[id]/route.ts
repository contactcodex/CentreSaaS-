import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/super-admin-auth';

// GET /api/super-admin/centres/[id] — get single centre with details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperAdmin();
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;

    const centre = await db.centre.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!centre) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    return NextResponse.json(centre);
  } catch (error) {
    console.error('Get centre error:', error);
    return NextResponse.json({ error: 'Failed to fetch centre' }, { status: 500 });
  }
}

// PUT /api/super-admin/centres/[id] — update centre info and subscription
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperAdmin();
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      contactPhone,
      contactWhatsapp,
      subscriptionStatus,
      subscriptionPack,
      isActive,
      notes,
    } = body;

    // Check centre exists
    const existing = await db.centre.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (contactWhatsapp !== undefined) updateData.contactWhatsapp = contactWhatsapp;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notes !== undefined) updateData.notes = notes;

    // ── Handle subscription updates ────────────────────────────────────────
    // When super admin assigns a pack/trial:
    // - Set subscriptionStatus (e.g., "trial_1min", "active", "unlimited")
    // - Set subscriptionPack (e.g., "1month", "1year") for active status
    // - Keep subscriptionStart = null → timer starts on FIRST LOGIN
    // - Keep subscriptionEnd = null → calculated on first login based on status/pack
    if (subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = subscriptionStatus;
      updateData.subscriptionStart = null;
      updateData.subscriptionEnd = null;

      if (subscriptionPack) {
        updateData.subscriptionPack = subscriptionPack;
      }
    } else if (subscriptionPack !== undefined) {
      // Only pack changed, not status
      updateData.subscriptionPack = subscriptionPack;
    }

    const updatedCentre = await db.centre.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedCentre);
  } catch (error) {
    console.error('Update centre error:', error);
    return NextResponse.json({ error: 'Failed to update centre' }, { status: 500 });
  }
}

// DELETE /api/super-admin/centres/[id] — delete a centre and all its data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperAdmin();
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;

    const existing = await db.centre.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    await db.centre.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Centre deleted successfully' });
  } catch (error) {
    console.error('Delete centre error:', error);
    return NextResponse.json({ error: 'Failed to delete centre' }, { status: 500 });
  }
}
