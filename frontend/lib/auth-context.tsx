"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  preferred_station: string;
  is_active: boolean;
  created_at?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (fullName: string, email: string, password: string, preferredStation?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updatePreferredStation: (stationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: () => {},
  updatePreferredStation: async () => {},
});

const API_BASE = "http://127.0.0.1:8000/api/v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("airsense_auth_token");
      const savedUser = localStorage.getItem("airsense_user");
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Failed to load auth from localStorage", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Authentication failed" };
      }
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("airsense_auth_token", data.access_token);
      localStorage.setItem("airsense_user", JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error during login" };
    }
  };

  const signup = async (
    fullName: string,
    email: string,
    password: string,
    preferredStation = "MH005"
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          preferred_station: preferredStation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Registration failed" };
      }
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("airsense_auth_token", data.access_token);
      localStorage.setItem("airsense_user", JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error during registration" };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("airsense_auth_token");
    localStorage.removeItem("airsense_user");
  };

  const updatePreferredStation = async (stationId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/preferred-station?station_id=${stationId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        localStorage.setItem("airsense_user", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Failed to update preferred station", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        updatePreferredStation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
