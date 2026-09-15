import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { StatusBar } from "expo-status-bar";

import { LanguageProvider } from "./src/i18n";
import { ThemeProvider } from "./src/ThemeContext";
import { TenantProvider } from "./src/TenantContext";
import { SystemSettingsProvider, useSystemSettings } from "./src/SystemSettingsContext";
import { PermissionProvider } from "./src/Layout/PermissionContext";
import { UndoProvider } from "./src/UndoContext";
import { AuthProvider, useAuth } from "./src/AuthContext";
import { ToastHost } from "./src/components/ui/notify";
import { useIdleLogout } from "./src/hooks/useIdleLogout";

import DrawerContent from "./src/Layout/DrawerContent";
import Header from "./src/Layout/Header";
import UpdateReminder from "./src/Layout/UpdateReminder";

import { navigationRef } from "./src/navigationRef";
import { pathForScreen, setPath } from "./src/navigation/navRoutes";

// Auth screens
import Login from "./src/Pages/Login";
import Register from "./src/Pages/Register";
import ShopRegister from "./src/Pages/ShopRegister";
import Setup from "./src/Pages/Setup";

// Protected screens
import Dashboard from "./src/Dashboard/Dashboard";
import Product from "./src/Pages/Product";
import AddProduct from "./src/Pages/AddProduct";
import Categories from "./src/Pages/Category";
import Suppliers from "./src/Pages/Supplier";
import Stock from "./src/Pages/Stock";
import StockHistory from "./src/Pages/StockHistory";
import Purchases from "./src/Pages/Purchases";
import PurchaseItems from "./src/Pages/PurchasesItem";
import SaleManager from "./src/Pages/SaleManager";
import SaleItems from "./src/Pages/SaleItems";
import Sales from "./src/Pages/Sales";
import CustomerPortal from "./src/Pages/CustomerPortal";
import CustomerPurchase from "./src/Pages/CustomerPurchase";
import CustomerPayment from "./src/Pages/CustomerPayment";
import Customers from "./src/Pages/Customer";
import Payments from "./src/Pages/Payment";
import Users from "./src/Pages/User";
import RoleAccess from "./src/Pages/RoleAccess";
import Shops from "./src/Pages/Shops";
import Reports from "./src/Pages/Report";
import Settings from "./src/Pages/Setting";
import ProfileSettings from "./src/Pages/ProfileSettings";
import SystemSettingsPage from "./src/Pages/SystemSettings";
import Exchange from "./src/Pages/ExchangeStoring";
import MyPocket from "./src/Pages/MyPocket";
import MyAccount from "./src/Pages/MyAccount";
import Logout from "./src/Pages/Logout";
import Help from "./src/Pages/Help";
import Feedback from "./src/Pages/Feedback";
import About from "./src/Pages/About";
import Terms from "./src/Pages/Terms-service";
import Privacy from "./src/Pages/Privacy-Policy";
import Support from "./src/Pages/Support";

const AuthStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const RootStack = createNativeStackNavigator();

const STACK_SCREEN_OPTS = { headerShown: false };
const AUTH_STACK_OPTS = { headerShown: false, gestureEnabled: false };
const DRAWER_OPTS = {
  header: (props) => <Header />,
  drawerStyle: { backgroundColor: "#1e293b", width: 290 },
  drawerContent: (props) => <DrawerContent {...props} />,
};

function MainApp() {
  const { settings } = useSystemSettings();
  useIdleLogout(settings.sessionTimeout);

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <UpdateReminder />
      <Drawer.Navigator screenOptions={DRAWER_OPTS}>
        <Drawer.Screen name="Dashboard" component={Dashboard} />
        <Drawer.Screen name="Products" component={Product} />
        <Drawer.Screen name="AddProduct" component={AddProduct} />
        <Drawer.Screen name="Categories" component={Categories} />
        <Drawer.Screen name="Suppliers" component={Suppliers} />
        <Drawer.Screen name="Stock" component={Stock} />
        <Drawer.Screen name="StockHistory" component={StockHistory} />
        <Drawer.Screen name="Purchases" component={Purchases} />
        <Drawer.Screen name="PurchaseItems" component={PurchaseItems} />
        <Drawer.Screen name="SaleManager" component={SaleManager} />
        <Drawer.Screen name="SaleItems" component={SaleItems} />
        <Drawer.Screen name="Sales" component={Sales} />
        <Drawer.Screen name="CustomerPortal" component={CustomerPortal} />
        <Drawer.Screen name="CustomerPurchase" component={CustomerPurchase} />
        <Drawer.Screen name="CustomerPayment" component={CustomerPayment} />
        <Drawer.Screen name="Customers" component={Customers} />
        <Drawer.Screen name="Payments" component={Payments} />
        <Drawer.Screen name="Users" component={Users} />
        <Drawer.Screen name="RoleAccess" component={RoleAccess} />
        <Drawer.Screen name="Shops" component={Shops} />
        <Drawer.Screen name="Reports" component={Reports} />
        <Drawer.Screen name="Settings" component={Settings} />
        <Drawer.Screen name="ProfileSettings" component={ProfileSettings} />
        <Drawer.Screen name="SystemSettings" component={SystemSettingsPage} />
        <Drawer.Screen name="Exchange" component={Exchange} />
        <Drawer.Screen name="MyPocket" component={MyPocket} />
        <Drawer.Screen name="MyAccount" component={MyAccount} />
        <Drawer.Screen name="Logout" component={Logout} />
        <Drawer.Screen name="Help" component={Help} />
        <Drawer.Screen name="Feedback" component={Feedback} />
        <Drawer.Screen name="About" component={About} />
        <Drawer.Screen name="Terms" component={Terms} />
        <Drawer.Screen name="Privacy" component={Privacy} />
        <Drawer.Screen name="Support" component={Support} />
      </Drawer.Navigator>
    </View>
  );
}

function AuthScreens() {
  return (
    <AuthStack.Navigator screenOptions={AUTH_STACK_OPTS} initialRouteName="Login">
      <AuthStack.Screen name="Login" component={Login} />
      <AuthStack.Screen name="Register" component={Register} />
      <AuthStack.Screen name="ShopRegister" component={ShopRegister} />
      <AuthStack.Screen name="Setup" component={Setup} />
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const { isLoggedIn, isStaff } = useAuth();
  const initial = isLoggedIn ? "Main" : "Auth";
  return (
    <RootStack.Navigator screenOptions={STACK_SCREEN_OPTS} initialRouteName={initial}>
      <RootStack.Screen name="Auth" component={AuthScreens} />
      <RootStack.Screen name="Main" component={MainApp} />
    </RootStack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    // Keep window.location.pathname in sync with the active route so any
    // ported logic that reads it (e.g. ProtectedRoute-style checks) works.
    const unsub = navigationRef.addListener?.("state", () => {
      const current = navigationRef.getCurrentRoute?.();
      if (current?.name) setPath(pathForScreen(current.name));
    });
    return () => unsub?.();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LanguageProvider>
        <ThemeProvider>
          <TenantProvider>
            <SystemSettingsProvider>
              <PermissionProvider>
                <UndoProvider>
                  <AuthProvider>
                    <ToastHost>
                      <NavigationContainer ref={navigationRef}>
                        <RootNavigator />
                      </NavigationContainer>
                    </ToastHost>
                  </AuthProvider>
                </UndoProvider>
              </PermissionProvider>
            </SystemSettingsProvider>
          </TenantProvider>
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}