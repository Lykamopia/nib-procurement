
'use server';

import { NextResponse } from 'next/server';
import { departments, auditLogs, users } from '@/lib/data-store';
import { Department } from '@/lib/types';

export async function GET() {
  return NextResponse.json(departments);
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

    if (departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ error: 'Department with this name already exists' }, { status: 409 });
    }

    const newDepartment: Department = {
      id: `DEPT-${Date.now()}`,
      name,
    };

    departments.push(newDepartment);

    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'CREATE_DEPARTMENT',
        entity: 'Department',
        entityId: newDepartment.id,
        details: `Created new department: "${name}".`,
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

    const departmentIndex = departments.findIndex(d => d.id === id);
    if (departmentIndex === -1) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    
    const oldName = departments[departmentIndex].name;

    if (departments.some(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== id)) {
        return NextResponse.json({ error: 'Another department with this name already exists' }, { status: 409 });
    }

    departments[departmentIndex].name = name;
    
    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'UPDATE_DEPARTMENT',
        entity: 'Department',
        entityId: id,
        details: `Updated department name from "${oldName}" to "${name}".`,
    });


    return NextResponse.json(departments[departmentIndex]);
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

    const departmentIndex = departments.findIndex(d => d.id === id);
    if (departmentIndex === -1) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    
    const deletedDepartment = departments[departmentIndex];

    departments.splice(departmentIndex, 1);
    
    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: user.name,
        role: user.role,
        action: 'DELETE_DEPARTMENT',
        entity: 'Department',
        entityId: id,
        details: `Deleted department: "${deletedDepartment.name}".`,
    });

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
