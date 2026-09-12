import { createNavigationContainerRef } from "@react-navigation/native";

// Global navigation reference so code outside React components (idle logout,
// auth redirects, axios 401 handling) can navigate without hooks.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function resetTo(screen, params = {}) {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: screen, params }] });
  }
}