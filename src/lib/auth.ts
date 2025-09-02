
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
  if (users.some((u) => u.email === email)) {
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

  if (role === 'Vendor' && vendorDetails) {
      const newVendor: Vendor = {
          id: `VENDOR-${Date.now()}`,
          name: name, // Company Name
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
      // Link user to vendor id
      const userInDb = users.find(u => u.id === newUserId);
      if (userInDb) {
          (userInDb as any).vendorId = newVendor.id;
      }
  }

  const mockToken = `mock-token-for-${newUser.id}__ROLE__${newUser.role}__TS__${Date.now()}`;
  const { password: _, ...userWithoutPassword } = newUser;
  return { user: userWithoutPassword, token: mockToken, role: newUser.role };
}


export async function login(email: string, password: string): Promise<{ user: User; token: string; role: UserRole } | null> {
  const user = users.find((u) => u.email === email && u.password === password);
  if (user) {
    const mockToken = `mock-token-for-${user.id}__ROLE__${user.role}__TS__${Date.now()}`;
    const { password, ...userWithoutPassword } = user;

    // If the user is a vendor, find their corresponding vendor record and attach the ID.
    if (user.role === 'Vendor') {
        const vendor = vendors.find(v => v.userId === user.id);
        if (vendor) {
            userWithoutPassword.vendorId = vendor.id;
        }
    }

    return { user: userWithoutPassword, token: mockToken, role: user.role };
  }
  return null;
}

export async function getUserByToken(token: string): Promise<{ user: User, role: UserRole } | null> {
    if (!token.startsWith('mock-token-for-')) return null;

    try {
        const tokenContent = token.substring('mock-token-for-'.length);
        const [userId, rolePart] = tokenContent.split('__ROLE__');
        const [userRole] = rolePart.split('__TS__');
        
        const user = users.find(u => u.id === userId);

        if (user && user.role === userRole) {
          const { password, ...userWithoutPassword } = user;
          
          // Also link vendorId on token-based auth rehydration
          if (user.role === 'Vendor') {
             const vendor = vendors.find(v => v.userId === user.id);
             if (vendor) {
                userWithoutPassword.vendorId = vendor.id;
             }
          }

          return { user: userWithoutPassword, role: user.role as UserRole };
        }
    } catch(e) {
        console.error("Failed to parse token:", e);
        return null;
    }


    return null;
}
