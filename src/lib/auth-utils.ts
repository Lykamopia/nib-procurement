
import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken } from './auth';
import { PermissionAction, PermissionSubject, User } from './types';

type ApiHandler = (request: NextRequest, context: { params: any }, user: User) => Promise<NextResponse>;

export function withAuthorization(
    requiredPermissions: Array<{ action: PermissionAction, subject: PermissionSubject }>,
    handler: ApiHandler
) {
    return async (request: NextRequest, context: { params: any }): Promise<NextResponse> => {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }

        const userPayload = await getUserByToken(token);
        if (!userPayload) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }
        
        const { user } = userPayload;

        const hasPermission = requiredPermissions.every(requiredPerm =>
            user.role.permissions.some(userPerm =>
                userPerm.action === requiredPerm.action && userPerm.subject === requiredPerm.subject
            )
        );

        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to perform this action' }, { status: 403 });
        }

        return handler(request, context, user);
    };
}
