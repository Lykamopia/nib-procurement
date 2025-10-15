
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole } from '@/lib/types';
import { rolePermissions as defaultRolePermissions } from '@/lib/roles';

// Custom JWT decoding function to avoid dependency issues
function jwtDecode<T>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    return JSON.parse(jsonPayload) as T;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}


export interface RfqSenderSetting {
  type: 'all' | 'specific';
  userId?: string | null;
}

export interface CommitteeConfig {
    A: { min: number, max: number },
    B: { min: number, max: number },
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  allUsers: User[];
  rolePermissions: Record<UserRole, string[]>;
  rfqSenderSetting: RfqSenderSetting;
  committeeConfig: CommitteeConfig,
  login: (token: string, user: User, role: UserRole) => void;
  logout: () => void;
  loading: boolean;
  switchUser: (userId: string) => void;
  updateRolePermissions: (newPermissions: Record<UserRole, string[]>) => void;
  updateRfqSenderSetting: (newSetting: RfqSenderSetting) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  updateCommitteeConfig: (newConfig: CommitteeConfig) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>(defaultRolePermissions);
  const [rfqSenderSetting, setRfqSenderSetting] = useState<RfqSenderSetting>({ type: 'all' });
  const [committeeConfig, setCommitteeConfig] = useState<CommitteeConfig>({
      A: { min: 200001, max: Infinity },
      B: { min: 10000, max: 200000 },
  });


  const fetchAllUsers = useCallback(async () => {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const usersData = await response.json();
            setAllUsers(usersData);
            return usersData;
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch all users", error);
        return [];
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const users = await fetchAllUsers();
      try {
          const storedToken = localStorage.getItem('authToken');
          
          if (storedToken) {
              const decoded = jwtDecode<{ exp: number, iat: number, id: string } & User>(storedToken);
              if (decoded && decoded.exp * 1000 > Date.now()) {
                  // Wait for the full user list to be available, then find the full user object.
                  // This ensures all relations (like department) are correctly populated.
                  const fullUser = users.find((u: User) => u.id === decoded.id);

                  if (fullUser) {
                    setUser(fullUser);
                    setToken(storedToken);
                    setRole(fullUser.role);
                  } else {
                    // If user from token not in DB, treat as logged out
                     localStorage.removeItem('authToken');
                  }
              } else {
                  localStorage.removeItem('authToken');
              }
          }
          
          const storedPermissions = localStorage.getItem('rolePermissions');
          const storedRfqSetting = localStorage.getItem('rfqSenderSetting');
          const storedCommitteeConfig = localStorage.getItem('committeeConfig');
          
          if (storedPermissions) setRolePermissions(JSON.parse(storedPermissions));
          if (storedRfqSetting) setRfqSenderSetting(JSON.parse(storedRfqSetting));
          if (storedCommitteeConfig) setCommitteeConfig(JSON.parse(storedCommitteeConfig));

      } catch (error) {
          console.error("Failed to initialize auth from localStorage", error);
          localStorage.clear();
      }
      setLoading(false);
    };
    initializeAuth();
  }, [fetchAllUsers]);

  const login = (newToken: string, loggedInUser: User, loggedInRole: UserRole) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setUser(loggedInUser);
    setRole(loggedInRole);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  };
  
  const switchUser = async (userId: string) => {
      const targetUser = allUsers.find(u => u.id === userId);
      if (targetUser) {
          // Use a dummy password as the backend validates it.
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetUser.email, password: 'password123' }),
          });
          
          if(response.ok) {
              const result = await response.json();
              login(result.token, result.user, result.role);
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

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const userToUpdate = allUsers.find(u => u.id === userId);
    if (!userToUpdate) return;
    
    try {
        const response = await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userToUpdate, role: newRole, actorUserId: user?.id })
        });
        if (!response.ok) throw new Error("Failed to update role");
        await fetchAllUsers(); // re-fetch all users to get the updated list
    } catch (e) {
        console.error(e);
        // In a real app, you'd use a toast notification here
        // toast({variant: 'destructive', title: "Error", description: "Failed to update user role."})
    }
  }

  const updateCommitteeConfig = (newConfig: CommitteeConfig) => {
      localStorage.setItem('committeeConfig', JSON.stringify(newConfig));
      setCommitteeConfig(newConfig);
  }

  const authContextValue = useMemo(() => ({
      user,
      token,
      role,
      allUsers,
      rolePermissions,
      rfqSenderSetting,
      committeeConfig,
      login,
      logout,
      loading,
      switchUser,
      updateRolePermissions,
      updateRfqSenderSetting,
      updateUserRole,
      updateCommitteeConfig,
  }), [user, token, role, loading, allUsers, rolePermissions, rfqSenderSetting, committeeConfig, fetchAllUsers]);


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
