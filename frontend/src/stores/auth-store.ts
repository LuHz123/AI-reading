import { create } from "zustand";
import { getToken, setToken as saveToken, clearToken } from "@/utils/auth";

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => void;
  login: (token: string, username: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  isAuthenticated: true,
  isLoading: false,

  initialize: () => {
    set({ token: getToken(), isAuthenticated: true, isLoading: false });
  },

  login: (token, username) => {
    saveToken(token);
    set({ token, username, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    clearToken();
    set({ token: null, username: null, isAuthenticated: true, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
