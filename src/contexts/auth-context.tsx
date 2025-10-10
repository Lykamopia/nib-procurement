
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole } from '@/lib/types';
import { rolePermissions as defaultRolePermissions, allRoles } from '@/lib/roles';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  allUsers: User[];
  rolePermissions: Record<UserRole, string[]>;
  login: (token: string, user: User, role: UserRole) => void;
  logout: () => void;
  loading: boolean;
  isInitialized: boolean;
  switchUser: (userId: string) => void;
  updateRolePermissions: (newPermissions: Record<UserRole, string[]>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const initialPermissions = () => {
    const permissions: Partial<Record<UserRole, string[]>> = {};
    allRoles.forEach(r => {
        permissions[r] = defaultRolePermissions[r] || [];
    });
    return permissions as Record<UserRole, string[]>;
  };

  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>(initialPermissions());


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
    try {
        const users = await fetchAllUsers();
        const storedUserJSON = localStorage.getItem('user');
        const storedToken = localStorage.getItem('authToken');
        const storedPermissions = localStorage.getItem('rolePermissions');
        
        if (storedUserJSON && storedToken) {
            const storedUser = JSON.parse(storedUserJSON);
            const fullUser = users.find((u: User) => u.id === storedUser.id) || storedUser;
            
            setUser(fullUser);
            setToken(storedToken);
            setRole(fullUser.role.replace(/_/g, ' ') as UserRole);
        }

        if (storedPermissions) {
            setRolePermissions(JSON.parse(storedPermissions));
        } else {
            setRolePermissions(initialPermissions());
        }

    } catch (error) {
        console.error("Failed to initialize auth from localStorage", error);
        localStorage.clear();
    } finally {
        setIsInitialized(true);
        setLoading(false);
    }
  }, [fetchAllUsers]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = (newToken: string, loggedInUser: User, loggedInRole: UserRole) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('role', loggedInRole);
    setToken(newToken);
    setUser(loggedInUser);
    setRole(loggedInRole.replace(/_/g, ' ') as UserRole);
    setIsInitialized(true); // Explicitly mark as initialized on login
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setToken(null);
    setUser(null);
    setRole(null);
    setIsInitialized(false);
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

  const authContextValue = useMemo(() => ({
      user,
      token,
      role,
      allUsers,
      rolePermissions,
      login,
      logout,
      loading,
      isInitialized,
      switchUser,
      updateRolePermissions
  }), [user, token, role, loading, isInitialized, allUsers, rolePermissions]);


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
