import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import api from "./api/axiosConfig";
import { useLanguage } from "./i18n";
import { useTheme } from "./ThemeContext";

const SystemSettingsContext = createContext({ settings: {}, reload: () => {} });

export function SystemSettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const { setLang } = useLanguage();
  const { setTheme } = useTheme();
  const appliedBoot = useRef(false);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/system-settings");
      const flat = {};
      if (Array.isArray(data)) data.forEach((s) => { if (s.key) flat[s.key] = s.value; });
      setSettings(flat);
      return flat;
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    reload().then((flat) => {
      if (appliedBoot.current) return;
      appliedBoot.current = true;
      if (flat.language) setLang(flat.language);
      if (flat.darkMode) setTheme(flat.darkMode === "true" ? "dark" : "light");
    });
  }, [reload, setLang, setTheme]);

  // When the active tenant (shop) changes, pull that shop's settings.
  useEffect(() => {
    const handler = () => reload();
    window.addEventListener("tenantChanged", handler);
    return () => window.removeEventListener("tenantChanged", handler);
  }, [reload]);

  return (
    <SystemSettingsContext.Provider value={{ settings, reload }}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export const useSystemSettings = () => useContext(SystemSettingsContext);
