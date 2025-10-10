
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
        where: { 
            roleName: { 
                not: 'Vendor' 
            } 
        },
        include: { 
            department: true,
            committeeAssignments: true,
            role: true,
        }
    });
    const formattedUsers = users.map(u => ({
        ...u,
        role: u.role.name.replace(/_/g, ' '),
        department: u.department?.name || 'N/A'
    }));
    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to fetch users', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred while fetching users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, departmentId, actorUserId, approvalLimit, managerId } = body;
    
    const actor = await prisma.user.findUnique({where: { id: actorUserId }});
    if (!actor) {
        return NextResponse.json({ error: 'Action performing user not found' }, { status: 404 });
    }

    if (!name || !email || !password || !role || !departmentId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: { connect: { name: role.replace(/ /g, '_') } },
            department: { connect: { id: departmentId } },
            approvalLimit,
            manager: managerId && managerId !== 'null' ? { connect: { id: managerId } } : undefined,
        }
    });
    
    await prisma.auditLog.create({
        data: {
            user: { connect: { id: actor.id } },
            timestamp: new Date(),
            action: 'CREATE_USER',
            entity: 'User',
            entityId: newUser.id,
            details: `Created new user "${name}" with role ${role}.`,
        }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    if (error instanceof Error) {
        // Specifically check for the P2025 error for a more informative message
        if ((error as any).code === 'P2025') {
            return NextResponse.json({ error: 'Invalid data provided. Please ensure the selected role and department exist.', details: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
   try {
    const body = await request.json();
    const { id, name, email, role, departmentId, password, actorUserId, approvalLimit, managerId } = body;

    const actor = await prisma.user.findUnique({where: { id: actorUserId }});
    if (!actor) {
        return NextResponse.json({ error: 'Action performing user not found' }, { status: 404 });
    }

    if (!id || !name || !email || !role || !departmentId) {
      return NextResponse.json({ error: 'User ID and all fields are required' }, { status: 400 });
    }
    
    const oldUser = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!oldUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const updateData: any = {
        name,
        email,
        role: { connect: { name: role.replace(/ /g, '_') } },
        department: { connect: { id: departmentId } },
        approvalLimit: approvalLimit,
    };
    
    if (managerId && managerId !== 'null') {
      updateData.manager = { connect: { id: managerId } };
    } else {
      updateData.manager = { disconnect: true };
    }

    if (password) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData
    });

    await prisma.auditLog.create({
        data: {
            user: { connect: { id: actor.id } },
            timestamp: new Date(),
            action: 'UPDATE_USER',
            entity: 'User',
            entityId: id,
            details: `Updated user "${oldUser.name}". Name: ${oldUser.name} -> ${name}. Role: ${oldUser.role.name.replace(/_/g, ' ')} -> ${role}.`,
        }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
     console.error('Failed to update user:', error);
     if (error instanceof Error) {
        if ((error as any).code === 'P2025') {
            return NextResponse.json({ error: 'Invalid data provided. Please ensure the selected role and department exist.', details: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
   try {
    const body = await request.json();
    const { id, actorUserId } = body;

    const actor = await prisma.user.findUnique({where: { id: actorUserId }});
    if (!actor) {
        return NextResponse.json({ error: 'Action performing user not found' }, { status: 404 });
    }

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const userToDelete = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!userToDelete) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userToDelete.role.name === 'Admin') {
        return NextResponse.json({ error: 'Cannot delete an Admin user.' }, { status: 403 });
    }
    
    // Check if user is a manager to other users and reassign them
    const subordinates = await prisma.user.findMany({ where: { managerId: id } });
    for (const subordinate of subordinates) {
        await prisma.user.update({
            where: { id: subordinate.id },
            data: { managerId: userToDelete.managerId }, // Reassign to the deleted user's manager
        });
    }

    await prisma.user.delete({ where: { id } });
    
    await prisma.auditLog.create({
        data: {
            user: { connect: { id: actor.id } },
            timestamp: new Date(),
            action: 'DELETE_USER',
            entity: 'User',
            entityId: id,
            details: `Deleted user: "${userToDelete.name}".`,
        }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
