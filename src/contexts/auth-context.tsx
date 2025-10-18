
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
    id?: string;
    order?: number;
}

export interface ApprovalThreshold {
    id: string;
    name: string;
    min: number;
    max: number | null; // null for infinity
    steps: ApprovalStep[];
}

interface CommitteeConfig {
    [key: string]: {
        min: number;
        max: number;
    }
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  allUsers: User[];
  rolePermissions: Record<UserRole, string[]>;
  rfqSenderSetting: RfqSenderSetting;
  approvalThresholds: ApprovalThreshold[];
  committeeConfig: CommitteeConfig;
  login: (token: string, user: User, role: UserRole) => void;
  logout: () => void;
  loading: boolean;
  switchUser: (userId: string) => void;
  updateRolePermissions: (newPermissions: Record<UserRole, string[]>) => void;
  updateRfqSenderSetting: (newSetting: RfqSenderSetting) => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  updateApprovalThresholds: (newThresholds: ApprovalThreshold[]) => void;
  updateCommitteeConfig: (newConfig: any) => Promise<void>;
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
  const [approvalThresholds, setApprovalThresholds] = useState<ApprovalThreshold[]>([]);
  const [committeeConfig, setCommitteeConfig] = useState<CommitteeConfig>({});


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
  
  const fetchSettings = useCallback(async () => {
    try {
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        const rfqSetting = settings.find((s:any) => s.key === 'rfqSenderSetting');
        if (rfqSetting) setRfqSenderSetting(rfqSetting.value);
        
        const committeeConf = settings.find((s:any) => s.key === 'committeeConfig');
        if (committeeConf) setCommitteeConfig(committeeConf.value);
      }
      
      const approvalMatrixRes = await fetch('/api/settings/approval-matrix');
      if (approvalMatrixRes.ok) {
        const matrixData = await approvalMatrixRes.json();
        setApprovalThresholds(matrixData);
      }

    } catch (error) {
        console.error("Failed to fetch settings", error);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      await fetchSettings();
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
          if (storedPermissions) setRolePermissions(JSON.parse(storedPermissions));

      } catch (error) {
          console.error("Failed to initialize auth from localStorage", error);
          localStorage.clear();
      }
      setLoading(false);
    };
    initializeAuth();
  }, [fetchAllUsers, fetchSettings]);

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
  
  const updateRfqSenderSetting = async (newSetting: RfqSenderSetting) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'rfqSenderSetting', value: newSetting }),
      });
      if (!response.ok) throw new Error('Failed to save RFQ sender setting');
      setRfqSenderSetting(newSetting);
    } catch (e) {
      console.error(e);
      // Optionally re-throw or handle error in UI
    }
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
        await fetchAllUsers(); // Re-fetch all users to update the UI state
    } catch (e) {
        console.error(e);
    }
  }

  const updateApprovalThresholds = async (newThresholds: ApprovalThreshold[]) => {
      try {
          const response = await fetch('/api/settings/approval-matrix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newThresholds)
          });
          if (!response.ok) throw new Error("Failed to save approval matrix");
          const data = await response.json();
          setApprovalThresholds(data);
      } catch (e) {
          console.error("Failed to update approval thresholds", e);
      }
  }

  const updateCommitteeConfig = async (newConfig: CommitteeConfig) => {
      try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'committeeConfig', value: newConfig }),
        });
        if (!response.ok) throw new Error('Failed to save committee configuration');
        setCommitteeConfig(newConfig);
      } catch(e) {
          console.error(e);
          throw e; // re-throw to be caught in the component
      }
  }

  const authContextValue = useMemo(() => ({
      user,
      token,
      role,
      allUsers,
      rolePermissions,
      rfqSenderSetting,
      approvalThresholds,
      committeeConfig,
      login,
      logout,
      loading,
      switchUser,
      updateRolePermissions,
      updateRfqSenderSetting,
      updateUserRole,
      updateApprovalThresholds,
      updateCommitteeConfig,
  }), [user, token, role, loading, allUsers, rolePermissions, rfqSenderSetting, approvalThresholds, committeeConfig, fetchAllUsers]);


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
