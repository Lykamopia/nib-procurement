
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole } from '@/lib/types';
import { rolePermissions as defaultRolePermissions } from '@/lib/roles';
import { useToast } from '@/hooks/use-toast';

export interface RfqSenderSetting {
  type: 'all' | 'specific';
  userId?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  allUsers: User[];
  rolePermissions: Record<UserRole, string[]>;
  rfqSenderSetting: RfqSenderSetting;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
  switchUser: (userId: string) => void;
  updateRolePermissions: (newPermissions: Record<UserRole, string[]>) => void;
  updateRfqSenderSetting: (newSetting: RfqSenderSetting) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely get item from localStorage
const getStoredItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key “${key}”:`, error);
    return defaultValue;
  }
};

const getStoredToken = (): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    return localStorage.getItem('authToken');
}

// This function correctly handles all role name formats.
const normalizeRole = (roleOrRoleName: any): UserRole => {
    if (!roleOrRoleName) return 'Requester'; // Fallback role
    const roleName = typeof roleOrRoleName === 'string' ? roleOrRoleName : roleOrRoleName.name;
    if (!roleName) return 'Requester';
    return roleName.replace(/_/g, ' ') as UserRole;
}

const getInitialUser = (): User | null => {
    const storedUser = getStoredItem<User | null>('user', null);
    if (storedUser) {
        return {
            ...storedUser,
            role: normalizeRole(storedUser.role),
        };
    }
    return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [role, setRole] = useState<UserRole | null>(() => user ? normalizeRole(user.role) : null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>(() => getStoredItem('rolePermissions', defaultRolePermissions));
  const [rfqSenderSetting, setRfqSenderSetting] = useState<RfqSenderSetting>(() => getStoredItem('rfqSenderSetting', { type: 'all' }));


  const fetchAllUsers = useCallback(async () => {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const usersData = await response.json();
            const usersWithAssignments = usersData.map((u: any) => ({
                ...u,
                role: normalizeRole(u.role),
                committeeAssignments: u.committeeAssignments || [],
            }));
            setAllUsers(usersWithAssignments);
        }
    } catch (error) {
        console.error("Failed to fetch all users", error);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
        setLoading(true);
        await fetchAllUsers();
        const storedUser = getInitialUser();
        if (storedUser) {
            setUser(storedUser);
            setRole(normalizeRole(storedUser.role));
            setToken(getStoredToken());
        }
        setLoading(false);
    }
    initialize();
  }, [fetchAllUsers]);

  const login = (newToken: string, loggedInUser: User) => {
    const normalizedRole = normalizeRole(loggedInUser.role);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify({ ...loggedInUser, role: normalizedRole }));
    setToken(newToken);
    setUser({ ...loggedInUser, role: normalizedRole });
    setRole(normalizedRole);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  };
  
  const switchUser = async (userId: string) => {
      const targetUser = allUsers.find(u => u.id === userId);
      if (targetUser) {
          try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetUser.email, password: 'password123' }), // Assumes a default password for testing
              });
              
              if(response.ok) {
                  const result = await response.json();
                  login(result.token, result.user);
                  window.location.href = '/';
              } else {
                  console.error("Failed to switch user via API login.");
                  toast({ variant: "destructive", title: "Switch Failed", description: "Could not log in as the selected user."})
              }
          } catch (e) {
              console.error("Error during user switch:", e);
              toast({ variant: "destructive", title: "Error", description: "An error occurred while trying to switch users."})
          }
      }
  };

  const updateRolePermissions = (newPermissions: Record<UserRole, string[]>) => {
      localStorage.setItem('rolePermissions', JSON.stringify(newPermissions));
      setRolePermissions(newPermissions);
  }
  
  const updateRfqSenderSetting = (newSetting: RfqSenderSetting) => {
      localStorage.setItem('rfqSenderSetting', JSON.stringify(newSetting));
      setRfqSenderSetting(newSetting);
  }
  
  const { toast } = useToast();

  const memoizedUser = useMemo(() => user, [user]);

  const authContextValue = useMemo(() => ({
      user: memoizedUser,
      token,
      role,
      allUsers,
      rolePermissions,
      rfqSenderSetting,
      login,
      logout,
      loading,
      switchUser,
      updateRolePermissions,
      updateRfqSenderSetting
  }), [memoizedUser, token, role, loading, allUsers, rolePermissions, rfqSenderSetting]);


  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
