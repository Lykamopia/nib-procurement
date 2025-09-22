
'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { users, departments as inMemoryDepartments } from '@/lib/data-store'; // Some data still in-memory

export async function GET() {
    // This is temporary, should be replaced with Prisma fetch
    return NextResponse.json(inMemoryDepartments);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, userId } = body;
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }
    
    const existingDepartment = await prisma.department.findUnique({ where: { name } });
    if (existingDepartment) {
        return NextResponse.json({ error: 'Department with this name already exists' }, { status: 409 });
    }

    const newDepartment = await prisma.department.create({
      data: { name },
    });

    await prisma.auditLog.create({
        data: {
            user: { connect: { id: user.id } },
            timestamp: new Date(),
            action: 'CREATE_DEPARTMENT',
            entity: 'Department',
            entityId: newDepartment.id,
            details: `Created new department: "${name}".`,
        }
    });

    return NextResponse.json(newDepartment, { status: 201 });
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
    const { id, name, userId } = body;
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!id || !name) {
      return NextResponse.json({ error: 'Department ID and name are required' }, { status: 400 });
    }
    
    const department = await prisma.department.findUnique({ where: { id }});
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    const oldName = department.name;

    const existingDepartment = await prisma.department.findFirst({ where: { name, NOT: { id } } });
    if (existingDepartment) {
        return NextResponse.json({ error: 'Another department with this name already exists' }, { status: 409 });
    }

    const updatedDepartment = await prisma.department.update({
        where: { id },
        data: { name },
    });
    
    await prisma.auditLog.create({
        data: {
            user: { connect: { id: user.id } },
            timestamp: new Date(),
            action: 'UPDATE_DEPARTMENT',
            entity: 'Department',
            entityId: id,
            details: `Updated department name from "${oldName}" to "${name}".`,
        }
    });


    return NextResponse.json(updatedDepartment);
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
    const { id, userId } = body;

    const user = users.find(u => u.id === userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }
    
    const deletedDepartment = await prisma.department.delete({ where: { id } });
    
    await prisma.auditLog.create({
        data: {
            user: { connect: { id: user.id } },
            timestamp: new Date(),
            action: 'DELETE_DEPARTMENT',
            entity: 'Department',
            entityId: id,
            details: `Deleted department: "${deletedDepartment.name}".`,
        }
    });

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
