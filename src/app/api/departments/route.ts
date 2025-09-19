
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' }
  });
  return NextResponse.json(departments);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, userId } = body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) {
        return NextResponse.json({ error: 'Department with this name already exists' }, { status: 409 });
    }

    const newDepartment = await prisma.department.create({
      data: { name },
    });

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
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
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!id || !name) {
      return NextResponse.json({ error: 'Department ID and name are required' }, { status: 400 });
    }

    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    
    const oldName = department.name;

    const existing = await prisma.department.findFirst({ where: { name, id: { not: id } } });
    if (existing) {
        return NextResponse.json({ error: 'Another department with this name already exists' }, { status: 409 });
    }

    const updatedDepartment = await prisma.department.update({
        where: { id },
        data: { name }
    });
    
    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }
    
    // Check if any users are assigned to this department
    const usersInDept = await prisma.user.count({ where: { departmentId: id } });
    if (usersInDept > 0) {
        return NextResponse.json({ error: 'Cannot delete department with assigned users.' }, { status: 400 });
    }

    const deletedDepartment = await prisma.department.delete({
        where: { id }
    });
    
    await prisma.auditLog.create({
        data: {
            userId: user.id,
            role: user.role,
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
