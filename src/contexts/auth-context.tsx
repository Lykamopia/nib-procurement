
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole, ApprovalThreshold, RfqSenderSetting, CommitteeConfig } from '@/lib/types';

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
  updateRfqSenderSetting: (newSetting: RfqSenderSetting) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  updateApprovalThresholds: (newThresholds: ApprovalThreshold[]) => void;
  updateCommitteeConfig: (newConfig: CommitteeConfig) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>({} as Record<UserRole, string[]>);
  const [rfqSenderSetting, setRfqSenderSetting] = useState<RfqSenderSetting>({ type: 'all' });
  const [approvalThresholds, setApprovalThresholds] = useState<ApprovalThreshold[]>([]);
  const [committeeConfig, setCommitteeConfig] = useState<CommitteeConfig>({ A: { min: 0, max: 0 }, B: { min: 0, max: 0 }});


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
        const response = await fetch('/api/settings');
        if(response.ok) {
            const settings = await response.json();
            const approvalThresholdsSetting = settings.find((s:any) => s.key === 'approvalThresholds');
            const rfqSenderSettingItem = settings.find((s:any) => s.key === 'rfqSenderSetting');
            const rolePermissionsSetting = settings.find((s:any) => s.key === 'rolePermissions');
            const committeeConfigSetting = settings.find((s:any) => s.key === 'committeeConfig');

            if (approvalThresholdsSetting) setApprovalThresholds(approvalThresholdsSetting.value);
            if (rfqSenderSettingItem) setRfqSenderSetting(rfqSenderSettingItem.value);
            if (rolePermissionsSetting) setRolePermissions(rolePermissionsSetting.value);
            if (committeeConfigSetting) setCommitteeConfig(committeeConfigSetting.value);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      // Only run this on the initial application load
      if (!isInitialLoad) return;

      setLoading(true);
      const users = await fetchAllUsers();
      await fetchSettings();
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
      } catch (error) {
          console.error("Failed to initialize auth from localStorage", error);
          localStorage.clear();
      } finally {
        setLoading(false);
        setIsInitialLoad(false); // Mark initial load as complete
      }
    };
    initializeAuth();
  }, [isInitialLoad, fetchAllUsers, fetchSettings]);

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
          // Temporarily use a known good password for switching.
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

  const updateSettings = async (key: string, value: any) => {
      try {
        await fetch('/api/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        });
      } catch (error) {
        console.error(`Failed to update setting ${key}`, error);
      }
  }

  const updateRolePermissions = (newPermissions: Record<UserRole, string[]>) => {
      setRolePermissions(newPermissions);
      updateSettings('rolePermissions', newPermissions);
  }
  
  const updateRfqSenderSetting = (newSetting: RfqSenderSetting) => {
      setRfqSenderSetting(newSetting);
      updateSettings('rfqSenderSetting', newSetting);
  }

  const updateApprovalThresholds = (newThresholds: ApprovalThreshold[]) => {
      setApprovalThresholds(newThresholds);
      updateSettings('approvalThresholds', newThresholds);
  }

   const updateCommitteeConfig = (newConfig: CommitteeConfig) => {
      setCommitteeConfig(newConfig);
      updateSettings('committeeConfig', newConfig);
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
  }), [user, token, role, loading, allUsers, rolePermissions, rfqSenderSetting, approvalThresholds, committeeConfig, fetchAllUsers, fetchSettings]);


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
