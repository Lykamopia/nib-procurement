
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PermissionAction, PermissionSubject } from '@/lib/types';
import { User } from '@/lib/types';
import { getUserByToken } from '@/lib/auth';

export async function GET() {
  try {
    const permissions = await prisma.permission.findMany({
        orderBy: [
            { subject: 'asc' },
            { action: 'asc' },
        ]
    });
    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to fetch permissions', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userPayload = await getUserByToken(token);
        if (!userPayload || userPayload.user.role.name !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { permissions: newPermissionsState } = body;

        const allPermissions = await prisma.permission.findMany();
        const permissionMap = new Map(allPermissions.map(p => [`${p.subject}_${p.action}`, p.id]));

        const permissionsToLink: { roleName: string; permissionId: string }[] = [];

        for (const roleName in newPermissionsState) {
            const subjects = newPermissionsState[roleName];
            for (const subject in subjects) {
                const actions = subjects[subject];
                for (const action in actions) {
                    if (actions[action]) { // if the permission is checked
                        const key = `${subject as PermissionSubject}_${action as PermissionAction}`;
                        const permissionId = permissionMap.get(key);
                        if (permissionId) {
                            permissionsToLink.push({
                                roleName: roleName,
                                permissionId: permissionId,
                            });
                        }
                    }
                }
            }
        }
        
        await prisma.$transaction(async (tx) => {
            // Clear all existing permission links for non-admin/vendor roles
            const rolesToUpdate = await tx.role.findMany({
                where: {
                    name: {
                        notIn: ['Admin', 'Vendor']
                    }
                }
            });
            const roleNamesToUpdate = rolesToUpdate.map(r => r.name);

            await tx.permissionsOnRoles.deleteMany({
                where: {
                    roleName: { in: roleNamesToUpdate }
                }
            });

            // Create new links
            if (permissionsToLink.length > 0) {
                 await tx.permissionsOnRoles.createMany({
                    data: permissionsToLink,
                    skipDuplicates: true
                });
            }
        });
        
        await prisma.auditLog.create({
            data: {
                timestamp: new Date(),
                user: { connect: { id: userPayload.user.id } },
                action: 'MANAGE_PERMISSIONS',
                entity: 'System',
                entityId: 'Permissions',
                details: `User permissions were updated.`,
            }
        });

        return NextResponse.json({ message: 'Permissions updated successfully' });

    } catch (error) {
        console.error("Failed to save permissions:", error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to save permissions', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unknown error occurred while saving permissions' }, { status: 500 });
    }
}
