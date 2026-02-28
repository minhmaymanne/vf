import { atom } from "nanostores";

export const themeStore = atom<"light" | "dark">(
  typeof window !== "undefined"
    ? (localStorage.getItem("theme") as "light" | "dark") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : "light"
);

export function toggleTheme() {
  const next = themeStore.get() === "dark" ? "light" : "dark";
  themeStore.set(next);
  localStorage.setItem("theme", next);
  applyTheme(next);
}

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// Initialize on load
if (typeof window !== "undefined") {
  applyTheme(themeStore.get());
}
