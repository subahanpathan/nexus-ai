import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { data: settings } = useGetSettings({
    query: {
      queryKey: getGetSettingsQueryKey(),
      enabled: isLoaded && !!isSignedIn,
    },
  });
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    () => (localStorage.getItem("theme") as "light" | "dark" | "system") || "system"
  );

  useEffect(() => {
    if (settings?.theme) {
      setTheme(settings.theme as "light" | "dark" | "system");
      localStorage.setItem("theme", settings.theme);
    }
  }, [settings?.theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
}
