
'use server';

import { NextResponse } from 'next/server';
import { users, departments } from '@/lib/data-store';
import { User } from '@/lib/types';

export async function GET() {
  // Return all users except vendors
  const nonVendorUsers = users.filter(u => u.role !== 'Vendor');
  return NextResponse.json(nonVendorUsers);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, departmentId } = body;

    if (!name || !email || !password || !role || !departmentId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    
    const department = departments.find(d => d.id === departmentId);
    if (!department) {
        return NextResponse.json({ error: 'Selected department not found' }, { status: 404 });
    }

    const newUser: User = {
      id: `USER-${Date.now()}`,
      name,
      email,
      password,
      role,
      departmentId,
      department: department.name,
    };

    users.push(newUser);

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const { name, email, role, departmentId } = body;

    if (!id || !name || !email || !role || !departmentId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== id)) {
        return NextResponse.json({ error: 'Another user with this email already exists' }, { status: 409 });
    }

    const department = departments.find(d => d.id === departmentId);
    if (!department) {
        return NextResponse.json({ error: 'Selected department not found' }, { status: 404 });
    }

    users[userIndex] = {
        ...users[userIndex],
        name,
        email,
        role,
        departmentId,
        department: department.name,
    };
    if (body.password) {
        users[userIndex].password = body.password;
    }


    return NextResponse.json(users[userIndex]);
  } catch (error) {
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
   try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userIndex = users.findIndex(d => d.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (users[userIndex].role === 'Admin') {
        return NextResponse.json({ error: 'Cannot delete an Admin user.' }, { status: 403 });
    }

    users.splice(userIndex, 1);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
