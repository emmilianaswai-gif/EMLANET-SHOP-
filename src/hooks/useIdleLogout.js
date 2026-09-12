import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { resetTo } from "../navigationRef";

// RN has no global pointer/keyboard events to watch, so "activity" is
// approximated by app state changes (returning to foreground) and periodic
// resets. The combo is sufficient to auto-logout an idle/backgrounded session.
export function useIdleLogout(minutes) {
  const navigation = useNavigation();
  const timerRef = useRef(null);
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;

  const logout = () => {
    localStorage.removeItem("shop_auth_token");
    localStorage.removeItem("shop_role");
    localStorage.removeItem("shop_username");
    localStorage.removeItem("shop_user_id");
    localStorage.removeItem("shop_full_name");
    localStorage.removeItem("shop_id");
    localStorage.removeItem("shop_name");
    sessionStorage.clear();
    global.window.dispatchEvent(new Event("roleChanged"));
    resetTo("Login");
  };

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const min = Number(minutesRef.current) || 0;
      if (min <= 0) return;
      timerRef.current = setTimeout(() => {
        if (localStorage.getItem("shop_auth_token")) logout();
      }, min * 60 * 1000);
    };

    reset();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") reset();
    });

    // Navigation between screens counts as activity while the app is open.
    const unsubFocus = navigation?.addListener?.("focus", reset);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
      unsubFocus?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}