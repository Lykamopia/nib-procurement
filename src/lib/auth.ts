

import type { User, UserRole, Vendor } from './types';
import { prisma } from './prisma';

type VendorDetails = {
    contactPerson: string;
    address: string;
    phone: string;
    licensePath: string;
    taxIdPath: string;
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
        return null;
    }

    const newUser = await prisma.user.create({
        data: {
            name,
            email,
            password, // IMPORTANT: Hash in real app
            role: 'Vendor',
        }
    });
    console.log("Created new user:", newUser);

    if (role === 'Vendor' && vendorDetails) {
        const newVendor = await prisma.vendor.create({
            data: {
                name: name,
                contactPerson: vendorDetails.contactPerson,
                email: email,
                phone: vendorDetails.phone,
                address: vendorDetails.address,
                userId: newUser.id,
                kycStatus: 'Pending',
                kycDocuments: {
                    create: [
                        { name: 'Business License', url: vendorDetails.licensePath, submittedAt: new Date() },
                        { name: 'Tax ID Document', url: vendorDetails.taxIdPath, submittedAt: new Date() },
                    ]
                }
            }
        });
        console.log("Created new vendor profile:", newVendor);
        await prisma.user.update({
            where: { id: newUser.id },
            data: { vendorId: newVendor.id }
        });
        console.log(`Linked user ${newUser.id} to vendor ${newVendor.id}`);
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
      include: {
          vendor: true,
          department: true,
          committeeAssignments: true,
      }
  });

  if (user && user.password === password) { // IMPORTANT: Compare hashed passwords in real app
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
                vendor: true,
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
