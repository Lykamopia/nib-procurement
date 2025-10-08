
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PermissionAction, PermissionSubject } from '@/lib/types';

export async function GET() {
  try {
    const permissions = await prisma.permission.findMany();
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
        const body = await request.json();
        const { permissions: newPermissionsState } = body;

        const allPermissions = await prisma.permission.findMany();
        const permissionMap = new Map(allPermissions.map(p => [`${p.subject}_${p.action}`, p.id]));

        const permissionsToLink: { roleId: string; permissionId: string }[] = [];

        for (const roleId in newPermissionsState) {
            const subjects = newPermissionsState[roleId];
            for (const subject in subjects) {
                const actions = subjects[subject];
                for (const action in actions) {
                    if (actions[action]) { // if the permission is checked
                        const key = `${subject as PermissionSubject}_${action as PermissionAction}`;
                        const permissionId = permissionMap.get(key);
                        if (permissionId) {
                            permissionsToLink.push({
                                roleId: roleId,
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
            const roleIdsToUpdate = rolesToUpdate.map(r => r.id);

            await tx.permissionsOnRoles.deleteMany({
                where: {
                    roleId: { in: roleIdsToUpdate }
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

        return NextResponse.json({ message: 'Permissions updated successfully' });

    } catch (error) {
        console.error("Failed to save permissions:", error);
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to save permissions', details: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'An unknown error occurred while saving permissions' }, { status: 500 });
    }
}
