
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function GET() {
  const users = await prisma.user.findMany({
    include: { department: true }
  });
  return NextResponse.json(users.map(u => ({
    ...u,
    role: u.role.replace(/_/g, ' '),
    department: u.department?.name 
  })));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, departmentId, actorUserId } = body;

    const actor = await prisma.user.findUnique({ where: { id: actorUserId } });
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
    
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password, // In a real app, this should be hashed
        role: role.replace(/ /g, '_') as UserRole,
        department: { connect: { id: departmentId } }
      }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor.id,
            role: actor.role,
            action: 'CREATE_USER',
            entity: 'User',
            entityId: newUser.id,
            details: `Created new user "${name}" with role ${role}.`,
        }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
   try {
    const body = await request.json();
    const { id, name, email, role, departmentId, password, actorUserId } = body;

    const actor = await prisma.user.findUnique({ where: { id: actorUserId } });
    if (!actor) {
        return NextResponse.json({ error: 'Action performing user not found' }, { status: 404 });
    }

    if (!id || !name || !email || !role || !departmentId) {
      return NextResponse.json({ error: 'User ID and all fields are required' }, { status: 400 });
    }

    const oldUser = await prisma.user.findUnique({ where: { id }});
    if (!oldUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existingEmail = await prisma.user.findFirst({ where: { email, id: { not: id } }});
    if (existingEmail) {
        return NextResponse.json({ error: 'Another user with this email already exists' }, { status: 409 });
    }

    const dataToUpdate: any = {
        name,
        email,
        role: role.replace(/ /g, '_') as UserRole,
        department: { connect: { id: departmentId } }
    };
    if (password) {
        dataToUpdate.password = password; // Hash in real app
    }
    
    const updatedUser = await prisma.user.update({
        where: { id },
        data: dataToUpdate,
    });

    await prisma.auditLog.create({
        data: {
            userId: actor.id,
            role: actor.role,
            action: 'UPDATE_USER',
            entity: 'User',
            entityId: id,
            details: `Updated user "${oldUser.name}". Name: ${oldUser.name} -> ${name}. Role: ${oldUser.role} -> ${role}.`,
        }
    });


    return NextResponse.json(updatedUser);
  } catch (error) {
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
   try {
    const body = await request.json();
    const { id, actorUserId } = body;

    const actor = await prisma.user.findUnique({ where: { id: actorUserId } });
    if (!actor) {
        return NextResponse.json({ error: 'Action performing user not found' }, { status: 404 });
    }

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({ where: { id }});
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (userToDelete.role === 'Admin') {
        return NextResponse.json({ error: 'Cannot delete an Admin user.' }, { status: 403 });
    }
    
    await prisma.user.delete({ where: { id } });
    
    await prisma.auditLog.create({
        data: {
            userId: actor.id,
            role: actor.role,
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
