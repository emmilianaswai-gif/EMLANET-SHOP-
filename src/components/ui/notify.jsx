import { createContext, useContext, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { colors, font, radius, shadow } from "../../theme";

// Global toast host. Pages can either use the useNotify() hook (recommended)
// or call the bare notify(message, sub) helper, which works anywhere.
const ToastContext = createContext(() => {});

export function useNotify() {
  return useContext(ToastContext);
}

let _notifyImpl = null;

export function notify(message, sub) {
  _notifyImpl?.(message, sub);
}

export function ToastHost({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const notify = (message, sub) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, sub });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  };

  useEffect(() => {
    _notifyImpl = notify;
    return () => {
      _notifyImpl = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {!!toast && (
        <View pointerEvents="none" style={styles.wrap}>
          <Animated.View style={[styles.toast, { opacity }]}>
            <Text style={styles.msg} numberOfLines={2}>{toast.message}</Text>
            {!!toast.sub && <Text style={styles.sub}>{toast.sub}</Text>}
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export default notify;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 84,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    maxWidth: 480,
    backgroundColor: colors.slate900,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    ...shadow.raised,
  },
  msg: { color: "#fff", fontSize: font.sm, fontWeight: "600", textAlign: "center" },
  sub: { color: colors.slate400, fontSize: font.xs, textAlign: "center", marginTop: 2 },
});