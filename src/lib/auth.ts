

import type { User, UserRole, Vendor } from './types';
import { users } from './auth-store';
import { vendors } from './data-store';

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
  if (users.some((u) => u.email === email)) {
    console.error("Registration failed: User already exists.");
    return null; // User already exists
  }

  const newUserId = role === 'Vendor' ? `VENDOR-USER-${Date.now()}` : String(users.length + 1 + Date.now());
  
  const newUser: User = {
    id: newUserId,
    name,
    email,
    password,
    role,
  };
  users.push(newUser);
  console.log("Created new user:", newUser);

  if (role === 'Vendor' && vendorDetails) {
      const newVendor: Vendor = {
          id: `VENDOR-${Date.now()}`,
          name: name,
          contactPerson: vendorDetails.contactPerson,
          email: email,
          phone: vendorDetails.phone,
          address: vendorDetails.address,
          userId: newUserId,
          kycStatus: 'Pending',
          kycDocuments: [
              { name: 'Business License', url: '/placeholder-document.pdf', submittedAt: new Date() },
              { name: 'Tax ID Document', url: '/placeholder-document.pdf', submittedAt: new Date() },
          ]
      };
      vendors.unshift(newVendor);
      console.log("Created new vendor profile:", newVendor);
      const userInDb = users.find(u => u.id === newUserId);
      if (userInDb) {
          userInDb.vendorId = newVendor.id;
          console.log(`Linked user ${newUserId} to vendor ${newVendor.id}`);
      }
  }

  const mockToken = `mock-token-for-${newUser.id}__ROLE__${newUser.role}__TS__${Date.now()}`;
  const { password: _, ...userWithoutPassword } = newUser;
  console.log(`Registration successful for ${email}.`);
  return { user: userWithoutPassword, token: mockToken, role: newUser.role };
}


export async function login(email: string, password: string): Promise<{ user: User; token: string; role: UserRole } | null> {
  console.log(`Login attempt for email: ${email}`);
  const user = users.find((u) => u.email === email && u.password === password);
  if (user) {
    console.log("Login successful, user found:", user);
    const mockToken = `mock-token-for-${user.id}__ROLE__${user.role}__TS__${Date.now()}`;
    const { password, ...userWithoutPassword } = user;

    if (user.role === 'Vendor') {
        const vendor = vendors.find(v => v.userId === user.id);
        if (vendor) {
            userWithoutPassword.vendorId = vendor.id;
            console.log(`Vendor role detected. Linked user to vendorId: ${vendor.id}`);
        } else {
            console.warn(`Vendor user ${user.id} does not have a corresponding vendor profile.`);
        }
    }

    return { user: userWithoutPassword, token: mockToken, role: user.role };
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
        const user = users.find(u => u.id === userId);

        if (user && user.role === userRole) {
          console.log("Token valid. Found user:", user);
          const { password, ...userWithoutPassword } = user;
          
          if (user.role === 'Vendor') {
             const vendor = vendors.find(v => v.userId === user.id);
             if (vendor) {
                userWithoutPassword.vendorId = vendor.id;
                console.log(`Rehydrating session for vendor. Linked user to vendorId: ${vendor.id}`);
             } else {
                 console.warn(`Could not find vendor profile for vendor user ${user.id} during token rehydration.`);
             }
          }

          return { user: userWithoutPassword, role: user.role as UserRole };
        }
        console.error("User from token not found or role mismatch.");
    } catch(e) {
        console.error("Failed to parse token:", e);
        return null;
    }
    return null;
}
