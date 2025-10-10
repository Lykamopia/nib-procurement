
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole } from '@/lib/types';
import { rolePermissions as defaultRolePermissions } from '@/lib/roles';
import { RfqSenderSetting } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  allUsers: User[];
  rolePermissions: Record<UserRole, string[]>;
  rfqSenderSetting: RfqSenderSetting;
  highestApproverCanOverride: boolean;
  login: (token: string, user: User, role: UserRole) => void;
  logout: () => void;
  loading: boolean;
  switchUser: (userId: string) => void;
  updateRolePermissions: (newPermissions: Record<UserRole, string[]>) => void;
  updateRfqSenderSetting: (newSetting: RfqSenderSetting) => void;
  updateHighestApproverOverride: (newSetting: boolean) => void;
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
  const [highestApproverCanOverride, setHighestApproverCanOverride] = useState(false);


  const fetchAllUsers = useCallback(async () => {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const usersData = await response.json();
            const usersWithAssignments = usersData.map((u: any) => ({
                ...u,
                committeeAssignments: u.committeeAssignments || [],
            }));
            setAllUsers(usersWithAssignments);
            return usersWithAssignments;
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch all users", error);
        return [];
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    const users = await fetchAllUsers();
    try {
        const storedUserJSON = localStorage.getItem('user');
        const storedToken = localStorage.getItem('authToken');
        const storedPermissions = localStorage.getItem('rolePermissions');
        const storedRfqSetting = localStorage.getItem('rfqSenderSetting');
        const storedHighestApproverOverride = localStorage.getItem('highestApproverCanOverride');
        
        if (storedUserJSON && storedToken) {
            const storedUser = JSON.parse(storedUserJSON);
            const fullUser = users.find((u: User) => u.id === storedUser.id) || storedUser;
            
            setUser(fullUser);
            setToken(storedToken);
            setRole(fullUser.role as UserRole);
        }

        if (storedPermissions) {
            setRolePermissions(JSON.parse(storedPermissions));
        } else {
             localStorage.setItem('rolePermissions', JSON.stringify(defaultRolePermissions));
        }

        if (storedRfqSetting) {
            setRfqSenderSetting(JSON.parse(storedRfqSetting));
        } else {
             localStorage.setItem('rfqSenderSetting', JSON.stringify({ type: 'all' }));
        }
        if (storedHighestApproverOverride) {
            setHighestApproverCanOverride(JSON.parse(storedHighestApproverOverride));
        } else {
            localStorage.setItem('highestApproverCanOverride', JSON.stringify(false));
        }

    } catch (error) {
        console.error("Failed to initialize auth from localStorage", error);
        localStorage.clear();
    }
    setLoading(false);
  }, [fetchAllUsers]);

  useEffect(() => {
    initializeAuth();
  }, []);

  const login = (newToken: string, loggedInUser: User, loggedInRole: UserRole) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('role', loggedInRole);
    setToken(newToken);
    setUser(loggedInUser);
    setRole(loggedInRole);
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
  
  const updateHighestApproverOverride = (newSetting: boolean) => {
      localStorage.setItem('highestApproverCanOverride', JSON.stringify(newSetting));
      setHighestApproverCanOverride(newSetting);
  }

  const authContextValue = useMemo(() => ({
      user,
      token,
      role,
      allUsers,
      rolePermissions,
      rfqSenderSetting,
      highestApproverCanOverride,
      login,
      logout,
      loading,
      switchUser,
      updateRolePermissions,
      updateRfqSenderSetting,
      updateHighestApproverOverride,
  }), [user, token, role, loading, allUsers, rolePermissions, rfqSenderSetting, highestApproverCanOverride]);


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
