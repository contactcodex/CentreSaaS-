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
      subscriptionStart,
      subscriptionEnd,
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

    // Handle subscription updates
    if (subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = subscriptionStatus;

      // When subscription changes to active with a pack, auto-calculate end date
      if (subscriptionStatus === 'active' && subscriptionPack) {
        updateData.subscriptionPack = subscriptionPack;

        if (subscriptionStart) {
          updateData.subscriptionStart = new Date(subscriptionStart);
        } else {
          updateData.subscriptionStart = new Date();
        }

        const start = new Date(updateData.subscriptionStart as Date);

        switch (subscriptionPack) {
          case '1month':
            updateData.subscriptionEnd = new Date(
              start.getTime() + 30 * 24 * 60 * 60 * 1000
            );
            break;
          case '1year':
            updateData.subscriptionEnd = new Date(
              start.getTime() + 365 * 24 * 60 * 60 * 1000
            );
            break;
          case 'unlimited':
            updateData.subscriptionEnd = null; // never expires
            break;
          default:
            // For other packs, use provided subscriptionEnd or default to +30 days
            if (subscriptionEnd) {
              updateData.subscriptionEnd = new Date(subscriptionEnd);
            } else {
              updateData.subscriptionEnd = new Date(
                start.getTime() + 30 * 24 * 60 * 60 * 1000
              );
            }
        }
      } else {
        // If pack is not specified with active status, just set the dates if provided
        if (subscriptionStart !== undefined) {
          updateData.subscriptionStart = subscriptionStart
            ? new Date(subscriptionStart)
            : null;
        }
        if (subscriptionEnd !== undefined) {
          updateData.subscriptionEnd = subscriptionEnd
            ? new Date(subscriptionEnd)
            : null;
        }
      }
    } else {
      // subscriptionStatus not changing but individual fields might be
      if (subscriptionStart !== undefined) {
        updateData.subscriptionStart = subscriptionStart
          ? new Date(subscriptionStart)
          : null;
      }
      if (subscriptionEnd !== undefined) {
        updateData.subscriptionEnd = subscriptionEnd
          ? new Date(subscriptionEnd)
          : null;
      }
      if (subscriptionPack !== undefined) {
        updateData.subscriptionPack = subscriptionPack;
      }
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

    // Check centre exists
    const existing = await db.centre.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    // Delete the centre (cascade will handle related records via schema relations)
    await db.centre.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Centre deleted successfully' });
  } catch (error) {
    console.error('Delete centre error:', error);
    return NextResponse.json({ error: 'Failed to delete centre' }, { status: 500 });
  }
}
