
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

export interface ApprovalStep {
    role: UserRole;
}

export interface ApprovalThreshold {
    id: string;
    name: string;
    min: number;
    max: number | null; // null for infinity
    steps: ApprovalStep[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  allUsers: User[];
  rolePermissions: Record<UserRole, string[]>;
  rfqSenderSetting: RfqSenderSetting;
  approvalThresholds: ApprovalThreshold[];
  login: (token: string, user: User, role: UserRole) => void;
  logout: () => void;
  loading: boolean;
  switchUser: (userId: string) => void;
  updateRolePermissions: (newPermissions: Record<UserRole, string[]>) => void;
  updateRfqSenderSetting: (newSetting: RfqSenderSetting) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  updateApprovalThresholds: (newThresholds: ApprovalThreshold[]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultApprovalThresholds: ApprovalThreshold[] = [
    {
        id: 'tier-1',
        name: 'Low Value',
        min: 0,
        max: 10000,
        steps: [{ role: 'Manager_Procurement_Division' }],
    },
    {
        id: 'tier-2',
        name: 'Mid Value',
        min: 10001,
        max: 200000,
        steps: [
            { role: 'Committee_B_Member' },
            { role: 'Manager_Procurement_Division' },
            { role: 'Director_Supply_Chain_and_Property_Management' },
        ],
    },
    {
        id: 'tier-3',
        name: 'High Value',
        min: 200001,
        max: 1000000,
        steps: [
            { role: 'Committee_A_Member' },
            { role: 'Director_Supply_Chain_and_Property_Management' },
            { role: 'VP_Resources_and_Facilities' },
        ],
    },
    {
        id: 'tier-4',
        name: 'Very-High Value',
        min: 1000001,
        max: null,
        steps: [
            { role: 'Committee_A_Member' },
            { role: 'VP_Resources_and_Facilities' },
            { role: 'President' },
        ],
    },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>(defaultRolePermissions);
  const [rfqSenderSetting, setRfqSenderSetting] = useState<RfqSenderSetting>({ type: 'all' });
  const [approvalThresholds, setApprovalThresholds] = useState<ApprovalThreshold[]>(defaultApprovalThresholds);


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
              const decoded = jwtDecode<{ exp: number, iat: number } & User>(storedToken);
              if (decoded && decoded.exp * 1000 > Date.now()) {
                  const fullUser = users.find((u: User) => u.id === decoded.id) || decoded;
                  setUser(fullUser);
                  setToken(storedToken);
                  setRole(fullUser.role);
              } else {
                  localStorage.removeItem('authToken');
              }
          }
          
          const storedPermissions = localStorage.getItem('rolePermissions');
          const storedRfqSetting = localStorage.getItem('rfqSenderSetting');
          const storedApprovalThresholds = localStorage.getItem('approvalThresholds');
          
          if (storedPermissions) setRolePermissions(JSON.parse(storedPermissions));
          if (storedRfqSetting) setRfqSenderSetting(JSON.parse(storedRfqSetting));
          if (storedApprovalThresholds) setApprovalThresholds(JSON.parse(storedApprovalThresholds));

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
        await fetchAllUsers();
    } catch (e) {
        console.error(e);
    }
  }

  const updateApprovalThresholds = (newThresholds: ApprovalThreshold[]) => {
      localStorage.setItem('approvalThresholds', JSON.stringify(newThresholds));
      setApprovalThresholds(newThresholds);
  }

  const authContextValue = useMemo(() => ({
      user,
      token,
      role,
      allUsers,
      rolePermissions,
      rfqSenderSetting,
      approvalThresholds,
      login,
      logout,
      loading,
      switchUser,
      updateRolePermissions,
      updateRfqSenderSetting,
      updateUserRole,
      updateApprovalThresholds,
  }), [user, token, role, loading, allUsers, rolePermissions, rfqSenderSetting, approvalThresholds, fetchAllUsers]);


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
