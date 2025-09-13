
'use server';

import { NextResponse } from 'next/server';
import { departments, auditLogs } from '@/lib/data-store';
import { Department } from '@/lib/types';

export async function GET() {
  return NextResponse.json(departments);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

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
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Department ID and name are required' }, { status: 400 });
    }

    const departmentIndex = departments.findIndex(d => d.id === id);
    if (departmentIndex === -1) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    if (departments.some(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== id)) {
        return NextResponse.json({ error: 'Another department with this name already exists' }, { status: 409 });
    }

    departments[departmentIndex].name = name;

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
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    const departmentIndex = departments.findIndex(d => d.id === id);
    if (departmentIndex === -1) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    departments.splice(departmentIndex, 1);

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
