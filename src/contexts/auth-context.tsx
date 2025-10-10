
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole } from '@/lib/types';
import { rolePermissions as defaultRolePermissions, allRoles } from '@/lib/roles';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  allUsers: User[];
  rolePermissions: Record<string, string[]>;
  login: (token: string, user: User, role: UserRole) => void;
  logout: () => void;
  isInitialized: boolean;
  switchUser: (userId: string) => void;
  updateRolePermissions: (newPermissions: Record<string, string[]>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const initialPermissions = () => {
    const permissions: Partial<Record<string, string[]>> = {};
    allRoles.forEach(r => {
        const key = r.replace(/ /g, '_');
        permissions[key] = defaultRolePermissions[key as UserRole] || [];
    });
    return permissions as Record<string, string[]>;
  };

  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(initialPermissions());


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
        const storedUserJSON = localStorage.getItem('user');
        const storedToken = localStorage.getItem('authToken');
        const storedPermissionsJSON = localStorage.getItem('rolePermissions');
        const users = await fetchAllUsers();
        
        if (storedUserJSON && storedToken) {
            const storedUser = JSON.parse(storedUserJSON);
            const fullUser = users.find((u: User) => u.id === storedUser.id) || storedUser;
            
            setUser(fullUser);
            setToken(storedToken);
            setRole(fullUser.role as UserRole);
        }

        if (storedPermissionsJSON) {
            setRolePermissions(JSON.parse(storedPermissionsJSON));
        } else {
            setRolePermissions(initialPermissions());
        }

    } catch (error) {
        console.error("Failed to initialize auth from localStorage", error);
        localStorage.clear();
    } finally {
        setIsInitialized(true);
    }
  }, [fetchAllUsers]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (newToken: string, loggedInUser: User, loggedInRole: UserRole) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('role', loggedInRole);
    setToken(newToken);
    setUser(loggedInUser);
    setRole(loggedInRole);
    await fetchAllUsers();
    setIsInitialized(true);
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
      const users = allUsers.length > 0 ? allUsers : await fetchAllUsers();
      const targetUser = users.find(u => u.id === userId);
      
      if (targetUser) {
          try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetUser.email, password: 'password123' }),
              });
              
              if(response.ok) {
                  const result = await response.json();
                  await login(result.token, result.user, result.role);
                  window.location.href = '/';
              } else {
                  console.error("Failed to switch user via API.");
                  localStorage.setItem('user', JSON.stringify(targetUser));
                  localStorage.setItem('role', targetUser.role);
                  setUser(targetUser);
                  setRole(targetUser.role as UserRole);
                  window.location.reload();
              }
          } catch (e) {
              console.error("Error during user switch:", e);
          }
      }
  };

  const updateRolePermissions = (newPermissions: Record<string, string[]>) => {
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
      isInitialized,
      switchUser,
      updateRolePermissions
  }), [user, token, role, isInitialized, allUsers, rolePermissions]);


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
