
import { User as PrismaUser } from '@prisma/client';
import type { User, UserRole, Vendor } from './types';
import prisma from './prisma';

type VendorDetails = {
    contactPerson: string;
    address: string;
    phone: string;
}

export async function register(
    name: string, 
    email: string, 
    password: string, 
    role: UserRole,
    vendorDetails?: VendorDetails
): Promise<{ user: User; token: string; role: UserRole } | null> {
  console.log(`Registering user with email: ${email}`);
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.error("Registration failed: User already exists.");
    return null; // User already exists
  }
  
  const newUser = await prisma.user.create({
      data: {
          name,
          email,
          password, // Should be hashed
          role: 'Vendor',
      }
  });

  if (role === 'Vendor' && vendorDetails) {
      const newVendor = await prisma.vendor.create({
          data: {
              user: { connect: { id: newUser.id } },
              name: name,
              contactPerson: vendorDetails.contactPerson,
              email: email,
              phone: vendorDetails.phone,
              address: vendorDetails.address,
              kycStatus: 'Pending',
              kycDocuments: {
                  create: [
                    { name: 'Business License', url: '/placeholder-document.pdf' },
                    { name: 'Tax ID Document', url: '/placeholder-document.pdf' },
                  ]
              }
          }
      });
      await prisma.user.update({
          where: { id: newUser.id },
          data: { vendorId: newVendor.id }
      });
  }

  const mockToken = `mock-token-for-${newUser.id}__ROLE__${newUser.role}__TS__${Date.now()}`;
  const { password: _, ...userWithoutPassword } = newUser;
  console.log(`Registration successful for ${email}.`);
  return { user: userWithoutPassword as User, token: mockToken, role: newUser.role as UserRole };
}


export async function login(email: string, password: string): Promise<{ user: User; token: string; role: UserRole } | null> {
  console.log(`Login attempt for email: ${email}`);
  const user = await prisma.user.findUnique({ 
      where: { email },
      include: { department: true }
    });

  if (user && user.password === password) { // DO NOT use this in production
    console.log("Login successful, user found:", user);
    const mockToken = `mock-token-for-${user.id}__ROLE__${user.role}__TS__${Date.now()}`;
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword as User, token: mockToken, role: user.role as UserRole };
  }
  console.error(`Login failed for email: ${email}. User not found or password incorrect.`);
  return null;
}

export async function getUserByToken(token: string): Promise<{ user: User, role: UserRole } | null> {
    console.log("Attempting to get user by token.");
    if (!token.startsWith('mock-token-for-')) {
        console.error("Invalid token format.");
        return null;
    }

    try {
        const tokenContent = token.substring('mock-token-for-'.length);
        const [userId, rolePart] = tokenContent.split('__ROLE__');
        const [userRole] = rolePart.split('__TS__');
        
        console.log(`Parsed token -> userId: ${userId}, role: ${userRole}`);
        const user = await prisma.user.findUnique({ 
            where: { id: userId },
            include: {
                department: true,
                committeeAssignments: true,
            }
        });

        if (user && user.role === userRole) {
          console.log("Token valid. Found user:", user);
          const { password, ...userWithoutPassword } = user;
          
          return { user: userWithoutPassword as User, role: user.role as UserRole };
        }
        console.error("User from token not found or role mismatch.");
    } catch(e) {
        console.error("Failed to parse token:", e);
        return null;
    }
    return null;
}

export async function getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
        include: {
            department: true,
            committeeAssignments: true
        }
    });
    return users as User[];
}
