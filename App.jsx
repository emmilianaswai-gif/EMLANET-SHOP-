import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { StatusBar } from "expo-status-bar";

import { LanguageProvider } from "./i18n";
import { ThemeProvider } from "./ThemeContext";
import { TenantProvider } from "./TenantContext";
import { SystemSettingsProvider, useSystemSettings } from "./SystemSettingsContext";
import { PermissionProvider } from "./Layout/PermissionContext";
import { UndoProvider } from "./UndoContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { ToastHost } from "./components/ui/notify";
import { useIdleLogout } from "./hooks/useIdleLogout";

import DrawerContent from "./Layout/DrawerContent";
import Header from "./Layout/Header";
import UpdateReminder from "./Layout/UpdateReminder";

import { navigationRef } from "./navigationRef";
import { pathForScreen, setPath } from "./navigation/navRoutes";

// Auth screens
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import ShopRegister from "./Pages/ShopRegister";
import Setup from "./Pages/Setup";

// Protected screens
import Dashboard from "./Dashboard/Dashboard";
import Product from "./Pages/Product";
import AddProduct from "./Pages/AddProduct";
import Categories from "./Pages/Category";
import Suppliers from "./Pages/Supplier";
import Stock from "./Pages/Stock";
import StockHistory from "./Pages/StockHistory";
import Purchases from "./Pages/Purchases";
import PurchaseItems from "./Pages/PurchasesItem";
import SaleManager from "./Pages/SaleManager";
import SaleItems from "./Pages/SaleItems";
import Sales from "./Pages/Sales";
import CustomerPortal from "./Pages/CustomerPortal";
import CustomerPurchase from "./Pages/CustomerPurchase";
import CustomerPayment from "./Pages/CustomerPayment";
import Customers from "./Pages/Customer";
import Payments from "./Pages/Payment";
import Users from "./Pages/User";
import RoleAccess from "./Pages/RoleAccess";
import Shops from "./Pages/Shops";
import Reports from "./Pages/Report";
import Settings from "./Pages/Setting";
import ProfileSettings from "./Pages/ProfileSettings";
import SystemSettingsPage from "./Pages/SystemSettings";
import Exchange from "./Pages/ExchangeStoring";
import MyPocket from "./Pages/MyPocket";
import MyAccount from "./Pages/MyAccount";
import Logout from "./Pages/Logout";
import Help from "./Pages/Help";
import Feedback from "./Pages/Feedback";
import About from "./Pages/About";
import Terms from "./Pages/Terms-service";
import Privacy from "./Pages/Privacy-Policy";
import Support from "./Pages/Support";

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