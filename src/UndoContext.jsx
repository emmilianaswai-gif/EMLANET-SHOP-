import { createContext, useCallback, useContext, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { colors, radius, font, shadow } from "./theme";

const UndoContext = createContext(null);

export function UndoProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [progress, setProgress] = useState(100);
  const timers = useRef({ timeout: null, raf: null });
  const undoFnRef = useRef(null);

  const clear = useCallback(() => {
    if (timers.current.timeout) clearTimeout(timers.current.timeout);
    if (timers.current.raf) cancelAnimationFrame(timers.current.raf);
    timers.current.timeout = null;
    timers.current.raf = null;
    undoFnRef.current = null;
    setToast(null);
    setProgress(100);
  }, []);

  const notifyUndo = useCallback((message, undoFn, options = {}) => {
    const timeout = options.timeout || 5000;
    if (timers.current.timeout) clearTimeout(timers.current.timeout);
    if (timers.current.raf) cancelAnimationFrame(timers.current.raf);
    undoFnRef.current = options.undo === false ? null : undoFn;
    setToast({ id: Date.now(), message, sub: options.sub, canUndo: options.undo !== false });
    setProgress(100);
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / timeout) * 100));
      if (elapsed < timeout) {
        timers.current.raf = requestAnimationFrame(tick);
      } else {
        timers.current.raf = null;
      }
    };
    timers.current.raf = requestAnimationFrame(tick);
    timers.current.timeout = setTimeout(() => {
      undoFnRef.current = null;
      clear();
    }, timeout);
  }, [clear]);

  const doUndo = useCallback(() => {
    const fn = undoFnRef.current;
    clear();
    if (fn) fn();
  }, [clear]);

  return (
    <UndoContext.Provider value={{ notifyUndo, clear }}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={styles.wrap}>
          <View style={styles.toast}>
            <View style={styles.row}>
              <AntDesign name="checkcircle" size={18} color={colors.success} />
              <View style={styles.body}>
                <Text style={styles.msg} numberOfLines={2}>{toast.message}</Text>
                {!!toast.sub && <Text style={styles.sub}>{toast.sub}</Text>}
              </View>
              {toast.canUndo && (
                <Pressable style={styles.undoBtn} onPress={doUndo}>
                  <AntDesign name="undo" size={13} color="#fff" />
                  <Text style={styles.undoText}>Undo</Text>
                </Pressable>
              )}
              <Pressable style={styles.dismiss} onPress={clear} hitSlop={8}>
                <AntDesign name="close" size={13} color={colors.slate300} />
              </Pressable>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>
      )}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  return useContext(UndoContext);
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 20,
    right: 20,
    left: 20,
    alignItems: "flex-end",
    zIndex: 9999,
  },
  toast: {
    minWidth: 280,
    maxWidth: "100%",
    backgroundColor: colors.slate900,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow.raised,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  body: { flex: 1, minWidth: 0 },
  msg: { color: "#f1f5f9", fontSize: font.sm, fontWeight: "600" },
  sub: { color: colors.slate400, fontSize: font.xs, marginTop: 2 },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  undoText: { color: "#fff", fontWeight: "700", fontSize: font.xs },
  dismiss: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.sm,
    padding: 4,
  },
  track: { height: 3, backgroundColor: "rgba(255,255,255,0.08)" },
  fill: { height: "100%", backgroundColor: colors.primary },
});