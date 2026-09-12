import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage, t } from "../i18n";
import { usePermissions } from "./PermissionContext";
import { isSuperAdmin, roleLabel } from "../utils/roles";
import { colors, font, radius, spacing } from "../theme";

const currentRole = () => global.localStorage.getItem("shop_role") || "customer";

// Mirrors Sidebar.jsx sections. Each link navigates to the matching drawer
// screen; module access is enforced with the shared permission set.
const staffSections = [
  { icon: "grid-outline", links: [{ name: "Dashboard", labelKey: "dashboard", module: "dashboard" }] },
  {
    icon: "cube-outline",
    links: [
      { name: "Products", labelKey: "allProducts", module: "products" },
      { name: "AddProduct", labelKey: "addProduct", module: "products" },
      { name: "Categories", labelKey: "categories", module: "categories" },
    ],
  },
  {
    icon: "archive-outline",
    links: [
      { name: "Stock", labelKey: "stock", module: "stock" },
      { name: "StockHistory", labelKey: "stockHistory", module: "stock_history" },
    ],
  },
  {
    icon: "cart-outline",
    links: [
      { name: "Purchases", labelKey: "orders", module: "purchases" },
      { name: "PurchaseItems", labelKey: "purchaseItems", module: "purchase_items" },
    ],
  },
  {
    icon: "bag-handle-outline",
    links: [
      { name: "SaleManager", labelKey: "saleManager", module: "sale_manager" },
      { name: "SaleItems", labelKey: "saleItems", module: "sale_items" },
      { name: "Sales", labelKey: "transactions", module: "sales" },
    ],
  },
  { icon: "repeat-outline", links: [{ name: "Exchange", labelKey: "exchangeStoring", module: "exchange" }] },
  { icon: "people-outline", links: [{ name: "Customers", labelKey: "customers", module: "customers" }] },
  { icon: "car-outline", links: [{ name: "Suppliers", labelKey: "suppliers", module: "suppliers" }] },
  { icon: "stats-chart-outline", links: [{ name: "Reports", labelKey: "reports", module: "reports" }] },
  { icon: "wallet-outline", links: [{ name: "MyPocket", labelKey: "myPocket", module: "my_pocket" }] },
  { icon: "settings-outline", links: [{ name: "Settings", labelKey: "settings", module: "settings" }] },
  { icon: "person-circle-outline", links: [{ name: "MyAccount", labelKey: "myAccount", module: null }] },
];

const adminOnlySections = [
  {
    icon: "shield-checkmark-outline",
    links: [
      { name: "Users", labelKey: "users", module: "users" },
      { name: "RoleAccess", labelKey: "roleAccess", module: "users" },
    ],
  },
];

const superAdminSections = [
  { icon: "storefront-outline", links: [{ name: "Shops", labelKey: "shops", module: null }] },
];

const customerSections = [
  { icon: "grid-outline", links: [{ name: "CustomerPortal", labelKey: "myPortal", module: "dashboard" }] },
  { icon: "cube-outline", links: [{ name: "Products", labelKey: "allProducts", module: "products" }] },
  { icon: "cart-outline", links: [{ name: "CustomerPurchase", labelKey: "placeOrder", module: "purchases" }] },
  { icon: "wallet-outline", links: [{ name: "CustomerPayment", labelKey: "myPayments", module: "payments" }] },
  { icon: "person-circle-outline", links: [{ name: "MyAccount", labelKey: "myAccount", module: "my_account" }] },
];

export default function DrawerContent({ state, navigation }) {
  useLanguage();
  const route = useRoute();
  const { hasPerm } = usePermissions();
  const role = currentRole();
  const sections =
    role === "customer"
      ? customerSections
      : [...staffSections, ...adminOnlySections, ...(isSuperAdmin(role) ? superAdminSections : [])];

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Ionicons name="storefront" size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>EMLANETSHOP</Text>
          <Text style={styles.brandSub}>{roleLabel(role)}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {sections.map((section, i) => {
          const visible = section.links.filter((l) => !l.module || hasPerm(l.module, "read"));
          if (!visible.length) return null;
          const Icon = section.icon;
          return (
            <View key={i} style={i > 0 && visible.length ? styles.section : undefined}>
              <View style={styles.sectionIcon}>
                <Ionicons name={Icon} size={16} color={colors.slate500} />
              </View>
              <View style={{ flex: 1 }}>
                {visible.map((link) => {
                  const active = state.routes[state.index]?.name === link.name;
                  return (
                    <Pressable
                      key={link.name}
                      style={[styles.link, active && styles.linkActive]}
                      onPress={() => navigation.navigate(link.name)}
                    >
                      <Text style={[styles.linkText, active && styles.linkTextActive]}>
                        {t(link.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Pressable style={styles.logout} onPress={() => navigation.navigate("Logout")}>
        <Ionicons name="log-out-outline" size={16} color={colors.danger} />
        <Text style={styles.logoutText}>{t("logout")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate800, paddingHorizontal: spacing.md },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { color: colors.white, fontWeight: "800", fontSize: font.lg, letterSpacing: 0.5 },
  brandSub: { color: colors.slate500, fontSize: font.xs, textTransform: "uppercase", letterSpacing: 0.8 },
  section: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.slate700, paddingTop: spacing.sm },
  sectionIcon: { marginBottom: spacing.xs },
  link: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    marginVertical: 1,
  },
  linkActive: { backgroundColor: colors.slate700 },
  linkText: { color: colors.slate300, fontSize: font.base, flex: 1 },
  linkTextActive: { color: colors.white, fontWeight: "700" },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate700,
  },
  logoutText: { color: colors.danger, fontSize: font.base, fontWeight: "700" },
});