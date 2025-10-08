
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { User, Role } from '@/lib/types';
import { getUserByToken } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  roleName: string | null;
  allUsers: User[];
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
  switchUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    await fetchAllUsers();
    try {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            const userPayload = await getUserByToken(storedToken);
            if (userPayload) {
                const response = await fetch(`/api/users/${userPayload.user.id}`);
                if (response.ok) {
                    const fullUser = await response.json();
                    setUser(fullUser);
                    setToken(storedToken);
                    setRole(fullUser.role);
                } else {
                     throw new Error('Failed to fetch full user details');
                }
            } else {
                throw new Error('Invalid token found in storage');
            }
        }
    } catch (error) {
        console.error("Auth initialization failed:", error);
        localStorage.clear();
        setUser(null);
        setToken(null);
        setRole(null);
    }
    setLoading(false);
  }, [fetchAllUsers]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = (newToken: string, loggedInUser: User) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setToken(newToken);
    setUser(loggedInUser);
    setRole(loggedInUser.role); // Directly set the role object from the loggedInUser
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
                body: JSON.stringify({ email: targetUser.email, password: 'password123' }), // Using mock password
            });
            
            if(response.ok) {
                const result = await response.json();
                login(result.token, result.user);
                window.location.href = '/';
            } else {
                console.error("Failed to switch user via login API.");
            }
          } catch (error) {
              console.error("Error switching user:", error);
          }
      }
  };

  const authContextValue = useMemo(() => ({
      user,
      token,
      role,
      roleName: role?.name || null,
      allUsers,
      login,
      logout,
      loading,
      switchUser
  }), [user, token, role, loading, allUsers]);

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
