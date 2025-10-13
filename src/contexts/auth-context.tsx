
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole } from '@/lib/types';
import { rolePermissions as defaultRolePermissions } from '@/lib/roles';

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
  login: (token: string, user: User, role: UserRole) => void;
  logout: () => void;
  loading: boolean;
  switchUser: (userId: string) => void;
  updateRolePermissions: (newPermissions: Record<UserRole, string[]>) => void;
  updateRfqSenderSetting: (newSetting: RfqSenderSetting) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely get item from localStorage
const getStoredItem = <T>(key: string, defaultValue: T): T => {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state synchronously from localStorage
  const [user, setUser] = useState<User | null>(() => getStoredItem('user', null));
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [role, setRole] = useState<UserRole | null>(() => getStoredItem('role', null));
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>(() => getStoredItem('rolePermissions', defaultRolePermissions));
  const [rfqSenderSetting, setRfqSenderSetting] = useState<RfqSenderSetting>(() => getStoredItem('rfqSenderSetting', { type: 'all' }));


  // This function correctly handles all role name formats.
  const normalizeRole = (roleName: string): UserRole => {
    return roleName.replace(/_/g, ' ') as UserRole;
  }

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
        setLoading(false);
    }
    initialize();
  }, [fetchAllUsers]);

  const login = (newToken: string, loggedInUser: User, loggedInRole: UserRole) => {
    const normalizedRole = normalizeRole(loggedInUser.role);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify({ ...loggedInUser, role: normalizedRole }));
    localStorage.setItem('role', JSON.stringify(normalizedRole));
    setToken(newToken);
    setUser({ ...loggedInUser, role: normalizedRole });
    setRole(normalizedRole);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setToken(null);
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  };
  
  const switchUser = async (userId: string) => {
      const targetUser = allUsers.find(u => u.id === userId);
      if (targetUser) {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetUser.email, password: 'password123' }),
          });
          
          if(response.ok) {
              const result = await response.json();
              login(result.token, result.user, result.user.role);
              window.location.href = '/';
          } else {
              console.error("Failed to switch user.")
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

  const authContextValue = useMemo(() => ({
      user,
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
  }), [user, token, role, loading, allUsers, rolePermissions, rfqSenderSetting]);


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
