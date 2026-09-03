import { create } from "zustand";
import { persist } from "zustand/middleware";

type Admin = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
};

type AuthState = {
  token: string | null;
  admin: Admin | null;
  setSession: (token: string, admin: Admin) => void;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      setSession: (token, admin) => set({ token, admin }),
      logout: () => set({ token: null, admin: null }),
    }),
    { name: "garoa-admin" },
  ),
);
