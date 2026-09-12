import { Alert, ToastAndroid, Platform } from "react-native";

// Async confirmation dialog, returns a Promise<boolean>. Emulates the web
// app's window.confirm() so ported pages can `await confirmDialog(...)`.
export function confirmDialog(message, title = "Confirm", { destructive = false } = {}) {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "OK", style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

// Single-button alert for pages that call `window.alert(message)`.
export function alertMessage(message, title = "") {
  if (Platform.OS === "android" && !title) {
    ToastAndroid.show(String(message || ""), ToastAndroid.SHORT);
    return;
  }
  return new Promise((resolve) => {
    Alert.alert(
      title || "",
      String(message ?? ""),
      [{ text: "OK", onPress: () => resolve() }],
      { cancelable: true, onDismiss: () => resolve() }
    );
  });
}

export function toastMessage(message) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

// Emulate the browser `confirm` and `alert` so pages can `await confirm(...)`
// or `alert(message)` without any RN imports.
if (typeof global !== "undefined") {
  global.confirm = (m, t) => confirmDialog(m, t);
  global.confirmDialog = confirmDialog;
  global.alert = alertMessage;
  const w = global.window;
  if (w && typeof w === "object") {
    w.confirm = global.confirm;
    w.confirmDialog = confirmDialog;
    w.alert = alertMessage;
  }
}