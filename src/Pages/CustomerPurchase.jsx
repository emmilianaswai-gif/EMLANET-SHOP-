import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/axiosConfig";
import Spinner from "../components/Spinner";
import QuantityInput from "../components/ui/QuantityInput";
import { TextField, SelectField, Button, Card, EmptyState } from "../components/ui";
import { t, useLanguage } from "../i18n";
import { useRoute } from "@react-navigation/native";
import { colors, font, radius, spacing, shadow } from "../theme";

const PAGE_SIZE = 10;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", color: "#16a34a", bg: "#f0fdf4" },
  { value: "debt", label: "Debt", color: "#dc2626", bg: "#fef2f2" },
];

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <View style={s.pagination}>
      <Pressable disabled={page <= 1} onPress={() => onChange(page - 1)} style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}>
        <Ionicons name="chevron-back" size={13} color={page <= 1 ? colors.slate300 : colors.slate600} />
        <Text style={[s.pageBtnText, page <= 1 && s.pageBtnTextDisabled]}>{t("prev")}</Text>
      </Pressable>
      {pages.map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} style={[s.pageNumBtn, i === page && s.pageNumBtnActive]}>
          <Text style={[s.pageNumText, i === page && s.pageNumTextActive]}>{i}</Text>
        </Pressable>
      ))}
      <Pressable disabled={page >= totalPages} onPress={() => onChange(page + 1)} style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}>
        <Text style={[s.pageBtnText, page >= totalPages && s.pageBtnTextDisabled]}>{t("next")}</Text>
        <Ionicons name="chevron-forward" size={13} color={page >= totalPages ? colors.slate300 : colors.slate600} />
      </Pressable>
    </View>
  );
}

export default function CustomerPurchase() {
  useLanguage();
  const route = useRoute();
  const userId = localStorage.getItem("shop_user_id");
  const fullName = localStorage.getItem("shop_full_name") || localStorage.getItem("shop_username") || "";

  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    Promise.all([
      api.get("/products").catch(() => ({ data: [] })),
      api.get("/stocks").catch(() => ({ data: [] })),
    ]).then(([pr, sr]) => {
      const all = Array.isArray(pr.data) ? pr.data : [];
      setProducts(all);
      const smap = {};
      (Array.isArray(sr.data) ? sr.data : []).forEach((s) => { smap[s.productId ?? s.product?.id] = s.quantity; });
      setStockMap(smap);
      const pid = route.params?.product;
      if (pid) {
        const p = all.find((x) => x.id === Number(pid));
        if (p) {
          setCart([{ productId: p.id, name: p.name, price: p.price, quantity: 1 }]);
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  const getQty = (p) => stockMap[p.id] ?? (Number(p.quantity) || 0);

  const filteredProducts = searchQuery
    ? products.filter((p) => {
        if (p.expiryDate && Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000) < 0) return false;
        return p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : products.filter((p) => {
        if (p.expiryDate && Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000) < 0) return false;
        return true;
      });
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [searchQuery]);

  const getProductById = (id) => products.find((p) => p.id === Number(id));

  const addItem = () => {
    if (!selectedProduct) return;
    const product = getProductById(selectedProduct);
    if (!product) return;
    const available = getQty(product);
    if (available <= 0) {
      setMsg("This product is out of stock.");
      setTimeout(() => setMsg(""), 3000);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      const current = existing ? existing.quantity : 0;
      if (current + Number(qty) > available) {
        setMsg(`Only ${available} in stock.`);
        setTimeout(() => setMsg(""), 3000);
        return prev;
      }
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + Number(qty) }
            : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: Number(qty) }];
    });
    setSelectedProduct(null);
    setQty(1);
    setSearchQuery("");
  };

  const updateQty = (productId, delta) => {
    setCart((prev) => {
      const item = prev.find((x) => x.productId === productId);
      if (delta > 0 && item) {
        const p = getProductById(productId);
        const available = getQty(p);
        if (item.quantity + delta > available) {
          setMsg(`Only ${available} in stock.`);
          setTimeout(() => setMsg(""), 3000);
          return prev;
        }
      }
      return prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        })
        .filter(Boolean);
    });
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0 || !userId) return;
    setSaving(true);
    try {
      const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
      const totalCost = cart.reduce((s, i) => s + i.quantity * i.price, 0);
      const desc = `Order \u2014 ${fullName} \u2014 ${cart.length} item(s)`;
      const { data: purchase } = await api.post("/purchases", {
        productName: desc,
        quantity: totalQty,
        unitPrice: totalCost,
        purchaseDate: new Date().toISOString(),
        status: "Pending",
        customerName: fullName || null,
        customerContact: null,
      });
      for (const ci of cart) {
        await api.post("/purchase-items", {
          quantity: ci.quantity,
          costPrice: ci.price,
          purchase: { id: purchase.id },
          product: { id: ci.productId },
        }).catch(() => {});
      }
      setCart([]);
      setMsg("Order placed! Waiting for approval.");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Failed to place order. Please try again.");
      setTimeout(() => setMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <Spinner size={28} text="Loading products..." />
      </View>
    );
  }

  const productOptions = filteredProducts.map((p) => ({ value: p.id, label: p.name }));

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Ionicons name="cart-outline" size={22} color="#2563eb" />
          <Text style={s.headerTitle}>Purchase Products</Text>
          {fullName ? <Text style={s.nameText}>— {fullName}</Text> : null}
        </View>
      </View>

      {msg !== "" && (
        <View style={[s.msgBar, msg.includes("Failed") ? s.msgBarError : s.msgBarSuccess]}>
          <Ionicons name={msg.includes("Failed") ? "alert-circle" : "checkmark-circle"} size={13} color={msg.includes("Failed") ? "#991b1b" : "#166534"} />
          <Text style={[s.msgText, msg.includes("Failed") ? s.msgTextError : s.msgTextSuccess]}>{msg}</Text>
        </View>
      )}

      <View style={s.controlsRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={14} color={colors.slate400} style={s.searchIcon} />
          <TextField value={searchQuery} onChangeText={setSearchQuery} placeholder="Search products..." containerStyle={s.searchField} />
        </View>
        <View style={s.selectWrap}>
          <SelectField
            value={selectedProduct}
            onChange={(v) => setSelectedProduct(Number(v))}
            options={productOptions}
            placeholder="Select a product..."
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <View style={s.qtyWrap}>
          {(() => { const sp = filteredProducts.find((p) => String(p.id) === String(selectedProduct)); return (
            <QuantityInput value={qty} onChange={(v) => setQty(v || 1)}
              piecesPerUnit={sp?.piecesPerUnit || 0} unit={sp?.unit || "piece"}
              min={1} />
          ); })()}
        </View>
        <Button title="Add" variant="primary" size="sm" onPress={addItem} disabled={!selectedProduct}
          icon={<Ionicons name="add" size={14} color={colors.white} />} />
      </View>

      <View style={s.mainRow}>
        <View style={s.productBrowser}>
          <Card padded={false} style={s.productGrid}>
            <ScrollView contentContainerStyle={s.productGridContent}>
              {filteredProducts.length === 0 ? (
                <EmptyState icon="cube-outline" message="No products found" />
              ) : (
                <>
                  <View style={s.productTiles}>
                    {paginatedProducts.map((product) => {
                      const inCart = cart.find((c) => c.productId === product.id);
                      const category = typeof product.category === "object" ? product.category?.name : product.category;
                      const stock = getQty(product);
                      const outOfStock = stock <= 0;
                      const isSelected = selectedProduct === product.id;
                      return (
                        <Pressable key={product.id} style={[s.productTile, isSelected && s.productTileSelected, inCart && !isSelected && s.productTileInCart]}
                          onPress={() => setSelectedProduct(product.id)}>
                          <View style={s.tileImageWrap}>
                            {product.image ? (
                              <Image source={{ uri: product.image }} style={s.tileImage} resizeMode="contain" />
                            ) : (
                              <Ionicons name="cube-outline" size={28} color={colors.slate300} />
                            )}
                          </View>
                          <Text style={s.tileName} numberOfLines={1}>{product.name}</Text>
                          {category ? <Text style={s.tileCategory}>{category}</Text> : null}
                          <View style={s.tilePriceRow}>
                            <Text style={s.tilePrice}>TZS {Number(product.price).toLocaleString()}</Text>
                            <Text style={s.tileUnit}>{product.unit || "pc"}</Text>
                          </View>
                          <Text style={[s.tileStock, outOfStock && s.tileStockOut, !outOfStock && stock <= 10 && s.tileStockLow]}>
                            {outOfStock ? "Out of stock" : `In stock: ${stock}`}
                          </Text>
                          {inCart ? <Text style={s.tileCartBadge}>x{inCart.quantity} in cart</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </>
              )}
            </ScrollView>
          </Card>
        </View>

        <View style={s.cartPanel}>
          <Card padded={false} style={s.cartCard}>
            <View style={s.cartHeader}>
              <View style={s.cartHeaderLeft}>
                <Ionicons name="cart-outline" size={16} color="#2563eb" />
                <Text style={s.cartHeaderTitle}>My Cart</Text>
              </View>
              {cart.length > 0 && (
                <Pressable onPress={() => setCart([])}>
                  <Text style={s.clearBtn}>Clear</Text>
                </Pressable>
              )}
            </View>

            <ScrollView style={s.cartBody} nestedScrollEnabled>
              {cart.length === 0 ? (
                <View style={s.cartEmpty}>
                  <Ionicons name="cart-outline" size={28} color={colors.slate300} />
                  <Text style={s.cartEmptyText}>Your cart is empty</Text>
                </View>
              ) : (
                <View style={s.cartItems}>
                  {cart.map((item) => (
                    <View key={item.productId} style={s.cartItem}>
                      <View style={s.cartItemInfo}>
                        <Text style={s.cartItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={s.cartItemPrice}>TZS {item.price.toLocaleString()} x {item.quantity}</Text>
                      </View>
                      <View style={s.cartItemQtyRow}>
                        <Pressable style={s.qtyBtn} onPress={() => updateQty(item.productId, -1)}>
                          <Text style={s.qtyBtnText}>-</Text>
                        </Pressable>
                        <Text style={s.qtyValue}>{item.quantity}</Text>
                        <Pressable style={s.qtyBtn} onPress={() => updateQty(item.productId, 1)}>
                          <Text style={s.qtyBtnText}>+</Text>
                        </Pressable>
                      </View>
                      <Text style={s.cartItemTotal}>TZS {(item.price * item.quantity).toLocaleString()}</Text>
                      <Pressable style={s.removeBtn} onPress={() => removeItem(item.productId)}>
                        <Ionicons name="trash-outline" size={13} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {cart.length > 0 && (
              <View style={s.cartFooter}>
                <Text style={s.paymentLabel}>Payment Method</Text>
                <View style={s.paymentMethods}>
                  {PAYMENT_METHODS.map((pm) => (
                    <Pressable key={pm.value} style={[s.paymentMethodBtn, paymentMethod === pm.value && { borderColor: pm.color, backgroundColor: pm.bg }]}
                      onPress={() => setPaymentMethod(pm.value)}>
                      <Text style={[s.paymentMethodText, paymentMethod === pm.value && { color: pm.color }]}>
                        {pm.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={s.cartSummary}>
                  <Text style={s.cartSummaryCount}>{cartCount} item{cartCount !== 1 ? "s" : ""}</Text>
                  <Text style={s.cartSummaryTotal}>TZS {cartTotal.toLocaleString()}</Text>
                </View>

                <Button title={saving ? "Processing..." : "Place Order"} variant={paymentMethod === "debt" ? "danger" : "primary"}
                  onPress={placeOrder} disabled={saving || cart.length === 0} loading={saving}
                  icon={<Ionicons name="cart-outline" size={14} color={colors.white} />} />
              </View>
            )}
          </Card>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm, gap: spacing.sm },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  nameText: { color: colors.slate500, fontSize: 12 },
  msgBar: { flexDirection: "row", alignItems: "center", gap: 6, padding: spacing.sm, borderRadius: radius.sm, flexShrink: 0 },
  msgBarSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  msgBarError: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: "#fecaca" },
  msgText: { fontSize: 12 },
  msgTextSuccess: { color: "#166534" },
  msgTextError: { color: colors.dangerDark },
  controlsRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end", flexShrink: 0, flexWrap: "wrap" },
  searchWrap: { flex: 1, minWidth: 160, position: "relative" },
  searchIcon: { position: "absolute", left: 8, top: 12, zIndex: 1 },
  searchField: { marginBottom: 0 },
  selectWrap: { minWidth: 160, flex: 1 },
  qtyWrap: { minWidth: 130, flex: 1 },
  mainRow: { flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 0 },
  productBrowser: { flex: 1, minWidth: 0 },
  productGrid: { flex: 1 },
  productGridContent: { padding: spacing.sm },
  productTiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  productTile: { width: "100%", minWidth: 150, flexGrow: 1, flexBasis: "30%", padding: 12, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.md, backgroundColor: colors.white },
  productTileSelected: { borderColor: "#2563eb", borderWidth: 2 },
  productTileInCart: { borderColor: "#16a34a", borderWidth: 2, backgroundColor: "#f0fdf4" },
  tileImageWrap: { height: 70, alignItems: "center", justifyContent: "center", marginBottom: 8, backgroundColor: colors.slate50, borderRadius: radius.sm, overflow: "hidden" },
  tileImage: { maxHeight: 70, maxWidth: "100%" },
  tileName: { fontSize: 13, fontWeight: "700", color: colors.slate900, marginBottom: 4 },
  tileCategory: { fontSize: 10, color: colors.slate400, marginBottom: 6 },
  tilePriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tilePrice: { fontSize: 15, fontWeight: "700", color: "#16a34a" },
  tileUnit: { fontSize: 10, color: colors.slate400 },
  tileStock: { marginTop: 4, fontSize: 11, fontWeight: "600", color: "#16a34a" },
  tileStockOut: { color: "#dc2626" },
  tileStockLow: { color: "#f59e0b" },
  tileCartBadge: { marginTop: 6, fontSize: 11, color: "#16a34a", fontWeight: "600" },
  cartPanel: { width: 300, flexShrink: 0 },
  cartCard: { flex: 1 },
  cartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  cartHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  cartHeaderTitle: { fontSize: 14, fontWeight: "700", color: colors.slate900 },
  clearBtn: { color: "#dc2626", fontSize: 11, fontWeight: "600" },
  cartBody: { padding: 12, flex: 1 },
  cartEmpty: { alignItems: "center", paddingVertical: 32 },
  cartEmptyText: { fontSize: 12, color: colors.slate400, marginTop: 8 },
  cartItems: { gap: 8 },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, backgroundColor: colors.slate50, borderRadius: radius.sm },
  cartItemInfo: { flex: 1, minWidth: 0 },
  cartItemName: { fontSize: 12, fontWeight: "600", color: colors.slate900 },
  cartItemPrice: { fontSize: 11, color: colors.slate500 },
  cartItemQtyRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  qtyBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.slate200, borderRadius: 4, backgroundColor: colors.white },
  qtyBtnText: { fontSize: 14, color: colors.slate600 },
  qtyValue: { width: 28, textAlign: "center", fontSize: 12, fontWeight: "700", color: colors.slate900 },
  cartItemTotal: { fontSize: 12, fontWeight: "700", color: colors.slate900 },
  removeBtn: { padding: 2 },
  cartFooter: { padding: 12, borderTopWidth: 1, borderTopColor: colors.slate100, gap: 10 },
  paymentLabel: { fontSize: 10, fontWeight: "700", color: colors.slate500, textTransform: "uppercase" },
  paymentMethods: { flexDirection: "row", gap: 6 },
  paymentMethodBtn: { flex: 1, alignItems: "center", justifyContent: "center", padding: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white },
  paymentMethodText: { fontSize: 11, fontWeight: "600", color: colors.slate500 },
  cartSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.slate100 },
  cartSummaryCount: { fontSize: 13, fontWeight: "600", color: colors.slate600 },
  cartSummaryTotal: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, backgroundColor: colors.white },
  pageBtnDisabled: { backgroundColor: colors.slate100 },
  pageBtnText: { fontSize: 13, fontWeight: "500", color: colors.slate600 },
  pageBtnTextDisabled: { color: colors.slate300 },
  pageNumBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.slate300, borderRadius: radius.sm, backgroundColor: colors.white },
  pageNumBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  pageNumText: { fontSize: 13, fontWeight: "500", color: colors.slate600 },
  pageNumTextActive: { color: "#fff" },
});
