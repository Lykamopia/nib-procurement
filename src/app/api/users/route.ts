
'use server';

import { NextResponse } from 'next/server';
import { users, departments, auditLogs } from '@/lib/data-store';
import { User } from '@/lib/types';

export async function GET() {
  // Return all users except vendors
  const nonVendorUsers = users.filter(u => u.role !== 'Vendor');
  return NextResponse.json(nonVendorUsers);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, departmentId, actorUserId } = body;

    const actor = users.find(u => u.id === actorUserId);
    if (!actor) {
        return NextResponse.json({ error: 'Action performing user not found' }, { status: 404 });
    }

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
    
    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: actor.name,
        role: actor.role,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: newUser.id,
        details: `Created new user "${name}" with role ${role}.`,
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

    const actor = users.find(u => u.id === actorUserId);
    if (!actor) {
        return NextResponse.json({ error: 'Action performing user not found' }, { status: 404 });
    }

    if (!id || !name || !email || !role || !departmentId) {
      return NextResponse.json({ error: 'User ID and all fields are required' }, { status: 400 });
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

    const oldUser = { ...users[userIndex] };
    const updatedUser = {
        ...users[userIndex],
        name,
        email,
        role,
        departmentId,
        department: department.name,
    };
    if (password) {
        updatedUser.password = password;
    }
    users[userIndex] = updatedUser;

    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: actor.name,
        role: actor.role,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: id,
        details: `Updated user "${oldUser.name}". Name: ${oldUser.name} -> ${name}. Role: ${oldUser.role} -> ${role}.`,
    });


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
    const body = await request.json();
    const { id, actorUserId } = body;

    const actor = users.find(u => u.id === actorUserId);
    if (!actor) {
        return NextResponse.json({ error: 'Action performing user not found' }, { status: 404 });
    }

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
    
    const deletedUser = users[userIndex];

    users.splice(userIndex, 1);
    
    auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        user: actor.name,
        role: actor.role,
        action: 'DELETE_USER',
        entity: 'User',
        entityId: id,
        details: `Deleted user: "${deletedUser.name}".`,
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
