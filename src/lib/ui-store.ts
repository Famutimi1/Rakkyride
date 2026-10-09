"use client";
import { create } from "zustand";
export type Theme = "light" | "dark" | "system";
interface UiState {
  theme: Theme;
  dense: boolean;
  menuOpen: boolean;
  setTheme: (theme: Theme) => void;
  setDense: (dense: boolean) => void;
  setMenuOpen: (menuOpen: boolean) => void;
}
export const useUiStore = create<UiState>((set) => ({
  theme: "light",
  dense: false,
  menuOpen: false,
  setTheme: (theme) => {
    try {
      localStorage.setItem("rakky-theme", theme);
    } catch {}
    set({ theme });
  },
  setDense: (dense) => {
    try {
      localStorage.setItem("rakky-density", String(dense));
    } catch {}
    set({ dense });
  },
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}));
