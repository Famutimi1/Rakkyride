"use client";
import { useEffect } from "react";
import { useUiStore } from "@/lib/ui-store";
export function ThemeProvider() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rakky-theme");
      if (saved === "light" || saved === "dark" || saved === "system")
        useUiStore.setState({ theme: saved });
      useUiStore.setState({
        dense: localStorage.getItem("rakky-density") === "true",
      });
      const sidebar = localStorage.getItem("rakky-sidebar-collapsed");
      if (sidebar === "true" || sidebar === "false")
        useUiStore.setState({ sidebarCollapsed: sidebar === "true" });
    } catch {}
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);
  return null;
}
