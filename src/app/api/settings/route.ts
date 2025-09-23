
'use server';

import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/settings';
import { users } from '@/lib/data-store';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({ error: 'Failed to retrieve settings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { settings, userId } = body;
    
    const user = users.find(u => u.id === userId);
    if (!user || user.role !== 'Procurement Officer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await updateSettings(settings);

    await prisma.auditLog.create({
        data: {
            user: { connect: { id: user.id } },
            timestamp: new Date(),
            action: 'UPDATE_SETTINGS',
            entity: 'System',
            entityId: 'settings',
            details: `Updated system notification settings.`,
        }
    });

    return NextResponse.json({ message: 'Settings updated successfully.' });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}
