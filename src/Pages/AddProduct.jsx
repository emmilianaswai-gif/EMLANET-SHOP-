import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Image, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t, useLanguage } from "../i18n";
import api from "../api/axiosConfig";
import { pickAndResizeImage } from "../utils/imageUtils";
import { TextField, Button, SelectField, QuantityInput } from "../components/ui";
import ComboBox from "../components/ComboBox";
import { useNav } from "../navigation/nav";
import { useRoute } from "@react-navigation/native";
import { colors, font, radius, spacing, shadow } from "../theme";

const UNIT_OPTIONS = ["piece", "kg", "g", "mg", "l", "ml", "m", "cm", "box", "pack", "packet", "bag", "bottle", "carton", "tin", "bundle", "drum", "roll"];
const PACKAGE_UNITS = ["box", "pack", "bag", "bottle", "carton", "tin", "drum", "roll", "packet", "bundle"];
const UNIT_RECOMMENDED = { box: 12, carton: 12, bundle: 12, pack: 6, packet: 20, bag: 50, tin: 24, drum: 50, roll: 100, bottle: 1 };
const PAYMENT_METHODS = ["Cash", "M-Pesa", "NMB Bank", "CRDB Bank", "Bank Transfer", "Other"];

const initialForm = () => ({ name: "", price: "", buyingPrice: "", expiryDate: "", unit: "piece", piecesPerUnit: "", quantity: "", lowStockThreshold: "", date: "", discount: "", discountType: "percent", image: "" });

const MAX_IMG_DIM = 800;

const toDateInputValue = (v) => {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

export default function AddProduct() {
  useLanguage();
  const route = useRoute();
  const nav = useNav();
  const editId = route.params?.edit;
  const fromStock = route.params?.from === "stock";

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [existingProducts, setExistingProducts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [supplierInput, setSupplierInput] = useState("");
  const [supplierCompany, setSupplierCompany] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierPayment, setSupplierPayment] = useState("");
  const [supplierPayMethod, setSupplierPayMethod] = useState("Cash");

  const [pendingProducts, setPendingProducts] = useState([]);
  const [expandedSupplierCell, setExpandedSupplierCell] = useState(null);
  const [entryEdits, setEntryEdits] = useState([]);

  useEffect(() => {
    api.get("/products")
      .then(({ data }) => setExistingProducts(Array.isArray(data) ? data : []))
      .catch(() => {});
    api.get("/categories")
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
    api.get("/suppliers")
      .then(({ data }) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editId) {
      setLoading(true);
      Promise.all([
        api.get(`/products/${editId}`),
        api.get(`/stocks/product/${editId}`).catch(() => ({ data: null })),
        api.get(`/stock-history/product/${editId}`).catch(() => ({ data: [] })),
      ]).then(([prodRes, stockRes, histRes]) => {
        const data = prodRes.data;
        const listProduct = (Array.isArray(existingProducts) ? existingProducts : []).find((p) => String(p.id) === String(editId));
        const persistedImage = data.image || listProduct?.image || "";
        setForm({
          ...initialForm(),
          name: data.name || "",
          price: data.price ?? "",
          buyingPrice: data.buyingPrice ?? "",
          expiryDate: toDateInputValue(data.expiryDate),
          unit: data.unit || "piece",
          piecesPerUnit: data.piecesPerUnit ?? "",
          quantity: stockRes?.data?.quantity ?? data.quantity ?? "",
          lowStockThreshold: stockRes?.data?.lowStockThreshold ?? "",
          date: toDateInputValue(stockRes?.data?.date),
          discount: data.discount ?? "",
          discountType: data.discountType || "percent",
          image: persistedImage,
        });
        const cid = data.category?.id || data.categoryId;
        const sid = data.supplier?.id || data.supplierId;
        setSelectedCategoryId(cid || null);
        setSelectedSupplierId(sid || null);
        setCategoryInput(data.category?.name || "");
        setSupplierInput(data.supplier?.name || "");
        setSupplierCompany(data.supplier?.company || "");
        setSupplierContact(data.supplier?.phone || "");
        setSupplierPayment("");
        setSupplierPayMethod("Cash");
        const addedEntries = (Array.isArray(histRes?.data) ? histRes.data : []).filter((h) => h.transactionType === "Added");
        setEntryEdits(addedEntries.map((h) => ({
          id: h.id,
          quantityChange: Number(h.quantityChange) || 0,
          date: toDateInputValue(h.createdAt || h.date),
          unitPrice: h.unitPrice != null ? h.unitPrice : (data.buyingPrice ?? ""),
        })));
      })
      .catch(() => setMessage({ text: t("failedToLoad"), type: "error" }))
      .finally(() => setLoading(false));
    }
  }, [editId]);

  const handleChange = useCallback((field) => (value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "unit" && !prev.piecesPerUnit) {
        next.piecesPerUnit = UNIT_RECOMMENDED[value] ?? "";
      }
      return next;
    });

    if (field === "name") {
      const filtered = existingProducts.filter(
        (p) => p.name?.toLowerCase().includes(value.toLowerCase()) && p.name !== value
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(value.length > 0 && filtered.length > 0);

      const exact = existingProducts.find((p) => p.name?.toLowerCase() === value.toLowerCase());
      if (exact) {
        setForm((prev) => ({
          ...prev,
          name: value,
          price: exact.price ?? prev.price,
          buyingPrice: exact.buyingPrice ?? prev.buyingPrice,
          expiryDate: toDateInputValue(exact.expiryDate || prev.expiryDate),
          unit: exact.unit || prev.unit,
          piecesPerUnit: exact.piecesPerUnit ?? prev.piecesPerUnit,
          image: exact.image ?? prev.image,
        }));
        const cid = exact.category?.id || exact.categoryId;
        const sid = exact.supplier?.id || exact.supplierId;
        if (cid) { setSelectedCategoryId(cid); setCategoryInput(exact.category?.name || ""); }
        if (sid) { applySupplier(exact.supplier); }
      }
    }
  }, [existingProducts]);

  const selectExistingProduct = (product) => {
    setForm((prev) => ({
      ...prev,
      name: product.name,
      price: product.price ?? prev.price,
      buyingPrice: product.buyingPrice ?? prev.buyingPrice,
      expiryDate: toDateInputValue(product.expiryDate || prev.expiryDate),
      unit: product.unit || prev.unit,
      piecesPerUnit: product.piecesPerUnit ?? prev.piecesPerUnit,
      image: product.image ?? prev.image,
    }));
    const cid = product.category?.id || product.categoryId;
    const sid = product.supplier?.id || product.supplierId;
    if (cid) {
      setSelectedCategoryId(cid);
      setCategoryInput(product.category?.name || "");
    }
    if (sid) {
      applySupplier(product.supplier);
    }
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  const applySupplier = (sup) => {
    if (!sup) return;
    setSupplierInput(sup.name);
    setSelectedSupplierId(sup.id);
    setSupplierCompany(sup.company || "");
    setSupplierContact(sup.phone || "");
    setSupplierPayment("");
  };

  const resolvedCategoryName = () => {
    if (selectedCategoryId) {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      return cat ? cat.name : categoryInput;
    }
    return categoryInput;
  };

  const resolvedSupplierName = () => {
    if (selectedSupplierId) {
      const sup = suppliers.find((s) => s.id === selectedSupplierId);
      return sup ? sup.name : supplierInput;
    }
    return supplierInput;
  };

  const resetForm = () => {
    setForm(initialForm());
    setSelectedCategoryId(null);
    setSelectedSupplierId(null);
    setCategoryInput("");
    setSupplierInput("");
    setSupplierCompany("");
    setSupplierContact("");
    setSupplierPayment("");
    setSupplierPayMethod("Cash");
    setMessage({ text: "", type: "" });
  };

  const handleImagePick = async () => {
    try {
      const result = await pickAndResizeImage({ maxDim: MAX_IMG_DIM, quality: 0.8 });
      if (result) setForm((prev) => ({ ...prev, image: result.dataUri }));
    } catch {
      setMessage({ text: t("imageTooLarge") || "Image invalid or too large", type: "error" });
    }
  };

  const addToList = () => {
    if (!form.name.trim()) return setMessage({ text: t("nameRequired"), type: "error" });
    setMessage({ text: "", type: "" });

    const item = {
      id: Date.now(),
      name: form.name.trim(),
      price: Number(form.price) || 0,
      buyingPrice: Number(form.buyingPrice) || 0,
      expiryDate: form.expiryDate || null,
      unit: form.unit || "piece",
      piecesPerUnit: form.piecesPerUnit === "" || form.piecesPerUnit == null ? null : Number(form.piecesPerUnit),
      quantity: Number(form.quantity) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      date: form.date || new Date().toISOString().split("T")[0],
      categoryId: selectedCategoryId,
      supplierId: selectedSupplierId,
      categoryName: resolvedCategoryName(),
      supplierName: resolvedSupplierName(),
      supplierCompany: supplierCompany,
      supplierContact: supplierContact,
      supplierPayment: Number(supplierPayment) || 0,
      supplierPayMethod: supplierPayMethod,
      discount: Number(form.discount) || 0,
      discountType: form.discountType || "percent",
      image: form.image || "",
    };

    setPendingProducts((prev) => [...prev, item]);
    resetForm();
  };

  const removeFromList = (id) => setPendingProducts((prev) => prev.filter((p) => p.id !== id));
  const clearList = () => setPendingProducts([]);

  const resolveAndSave = async (item) => {
    let catId = item.categoryId;
    let supId = item.supplierId;

    if (item.categoryName.trim() && !catId) {
      const existing = categories.find((c) => c.name?.toLowerCase() === item.categoryName.trim().toLowerCase());
      if (existing) {
        catId = existing.id;
      } else {
        const { data: newCat } = await api.post("/categories", { name: item.categoryName.trim() });
        catId = newCat.id;
        setCategories((prev) => [...prev, newCat]);
      }
    }
    if (item.supplierName.trim() && !supId) {
      let existing = suppliers.find((s) => s.name?.toLowerCase() === item.supplierName.trim().toLowerCase());
      if (existing) {
        supId = existing.id;
        const details = {
          name: existing.name,
          phone: item.supplierContact || existing.phone || "",
          email: existing.email || "",
          address: existing.address || "",
          company: item.supplierCompany || existing.company || "",
        };
        if (item.supplierContact || item.supplierCompany) {
          await api.put(`/suppliers/${supId}`, details).then(() => {
            setSuppliers((prev) => prev.map((s) => (s.id === supId ? { ...s, ...details } : s)));
          }).catch(() => {});
        }
      } else {
        const { data: newSup } = await api.post("/suppliers", {
          name: item.supplierName.trim(),
          phone: item.supplierContact || "",
          email: "",
          address: "",
          company: item.supplierCompany || "",
        });
        supId = newSup.id;
        setSuppliers((prev) => [...prev, newSup]);
      }
    }

    const payload = {
      name: item.name,
      price: item.price,
      buyingPrice: item.buyingPrice,
      expiryDate: item.expiryDate,
      unit: item.unit || "piece",
      piecesPerUnit: item.piecesPerUnit ?? null,
      quantity: item.quantity || 0,
      discount: item.discount || 0,
      discountType: item.discountType || "percent",
      image: item.image || "",
    };
    if (catId) payload.categoryId = catId;
    if (supId) payload.supplierId = supId;

    const { data: saved } = await api.post("/products", payload);

    if (supId && Number(item.supplierPayment || 0) > 0) {
      await api.post("/supplier-payments", {
        supplier: { id: supId },
        amount: Number(item.supplierPayment),
        method: item.supplierPayMethod || "Cash",
        notes: `Payment while adding "${item.name}"`,
      }).catch(() => {});
    }

    const stockQty = item.quantity || 0;
    if (stockQty > 0) {
      try {
        const existingStock = await api.get(`/stocks/product/${saved.id}`).catch(() => null);
        if (existingStock?.data?.id) {
          await api.put(`/stocks/${existingStock.data.id}`, {
            product: { id: saved.id },
            quantity: (existingStock.data.quantity || 0) + stockQty,
            lowStockThreshold: item.lowStockThreshold || existingStock.data.lowStockThreshold || 0,
            date: item.date || existingStock.data.date || "",
          }).catch(() => {});
        } else {
          await api.post("/stocks", {
            product: { id: saved.id },
            quantity: stockQty,
            lowStockThreshold: item.lowStockThreshold || 0,
            date: item.date || "",
          }).catch(() => {});
        }

        await api.post("/stock-history", {
          product: { id: saved.id },
          quantityChange: stockQty,
          resultingQuantity: stockQty,
          transactionType: "Added",
        }).catch(() => {});
      } catch {}
    }

    return saved;
  };

  const saveAll = async () => {
    if (pendingProducts.length === 0) return;
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      let saved = 0;
      for (const item of pendingProducts) {
        await resolveAndSave(item);
        saved++;
      }
      setMessage({ text: `${saved} ${t("productsSaved")}`, type: "success" });
      setPendingProducts([]);
      if (fromStock) {
        setTimeout(() => nav("/stock"), 1500);
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || t("failed"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      let resolvedCategoryId = selectedCategoryId;
      let resolvedSupplierId = selectedSupplierId;

      if (categoryInput.trim() && !resolvedCategoryId) {
        const existing = categories.find((c) => c.name?.toLowerCase() === categoryInput.trim().toLowerCase());
        if (existing) {
          resolvedCategoryId = existing.id;
        } else {
          const { data: newCat } = await api.post("/categories", { name: categoryInput.trim() });
          resolvedCategoryId = newCat.id;
          setCategories((prev) => [...prev, newCat]);
        }
      }
      if (supplierInput.trim() && !resolvedSupplierId) {
        const existing = suppliers.find((s) => s.name?.toLowerCase() === supplierInput.trim().toLowerCase());
        if (existing) {
          resolvedSupplierId = existing.id;
          const details = {
            name: existing.name,
            phone: supplierContact || existing.phone || "",
            email: existing.email || "",
            address: existing.address || "",
            company: supplierCompany || existing.company || "",
          };
          if (supplierContact || supplierCompany) {
            await api.put(`/suppliers/${resolvedSupplierId}`, details).then(() => {
              setSuppliers((prev) => prev.map((s) => (s.id === resolvedSupplierId ? { ...s, ...details } : s)));
            }).catch(() => {});
          }
        } else {
          const { data: newSup } = await api.post("/suppliers", {
            name: supplierInput.trim(),
            phone: supplierContact || "",
            email: "",
            address: "",
            company: supplierCompany || "",
          });
          resolvedSupplierId = newSup.id;
          setSuppliers((prev) => [...prev, newSup]);
        }
      }

      const payload = {
        name: form.name,
        price: Number(form.price) || 0,
        buyingPrice: Number(form.buyingPrice) || 0,
        expiryDate: form.expiryDate || null,
        unit: form.unit || "piece",
        piecesPerUnit: form.piecesPerUnit === "" || form.piecesPerUnit == null ? null : Number(form.piecesPerUnit),
        discount: Number(form.discount) || 0,
        discountType: form.discountType || "percent",
        image: form.image || "",
      };
      if (resolvedCategoryId) payload.categoryId = resolvedCategoryId;
      if (resolvedSupplierId) payload.supplierId = resolvedSupplierId;

      await api.put(`/products/${editId}`, payload);

      if (resolvedSupplierId && Number(supplierPayment) > 0) {
        await api.post("/supplier-payments", {
          supplier: { id: resolvedSupplierId },
          amount: Number(supplierPayment),
          method: supplierPayMethod || "Cash",
          notes: supplierCompany ? `Supplier company: ${supplierCompany}` : "",
        }).catch(() => {});
      }

      const newQty = entryEdits.reduce((s, e) => s + (Number(e.quantityChange) || 0), 0);
      try {
        const existingStock = await api.get(`/stocks/product/${editId}`).catch(() => null);
        const stockUnitPrice = Number(form.buyingPrice) || Number(form.price) || undefined;

        let cumulative = 0;
        const entryPromises = [];
        for (const e of entryEdits) {
          const qty = Number(e.quantityChange) || 0;
          cumulative += qty;
          const body = {
            product: { id: Number(editId) },
            quantityChange: qty,
            resultingQuantity: cumulative,
            transactionType: "Added",
            date: e.date || "",
          };
          if (e.unitPrice !== "" && e.unitPrice != null) body.unitPrice = Number(e.unitPrice) || 0;
          if (typeof e.id === "string" && e.id.startsWith("new-")) {
            entryPromises.push(api.post("/stock-history", body).catch(() => {}));
          } else {
            entryPromises.push(api.put(`/stock-history/${e.id}`, body).catch(() => {}));
          }
        }
        await Promise.all(entryPromises);

        if (existingStock?.data?.id) {
          const stockUpdate = {
            product: { id: Number(editId) },
            quantity: newQty,
            lowStockThreshold: Number(form.lowStockThreshold) || existingStock.data.lowStockThreshold || 0,
            date: form.date || existingStock.data.date || "",
          };
          if (stockUnitPrice) stockUpdate.unitPrice = stockUnitPrice;
          await api.put(`/stocks/${existingStock.data.id}`, stockUpdate).catch(() => {});
        } else if (newQty > 0) {
          const stockCreate = {
            product: { id: Number(editId) },
            quantity: newQty,
            lowStockThreshold: Number(form.lowStockThreshold) || 0,
            date: form.date || "",
          };
          if (stockUnitPrice) stockCreate.unitPrice = stockUnitPrice;
          await api.post("/stocks", stockCreate).catch(() => {});
        }
      } catch {}

      setMessage({ text: `${t("product")} ${t("updatedSuccess")}`, type: "success" });
      if (fromStock) {
        setTimeout(() => nav("/stock"), 1500);
      } else if (editId) {
        setTimeout(() => nav("/products"), 1500);
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || t("failed"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    if (field.type === "select") {
      return (
        <SelectField
          key={field.name}
          label={field.label}
          value={form[field.name] || ""}
          onChange={(v) => handleChange(field.name)(v)}
          options={field.options || []}
          containerStyle={{ marginBottom: spacing.sm }}
        />
      );
    }

    const keyboardType = field.type === "number" ? "numeric" : "default";
    const isDate = field.type === "date";

    return (
      <TextField
        key={field.name}
        label={field.label}
        value={form[field.name] || ""}
        onChangeText={handleChange(field.name)}
        placeholder={isDate ? "YYYY-MM-DD" : field.label}
        keyboardType={keyboardType}
        containerStyle={{ marginBottom: spacing.sm }}
      />
    );
  };

  const renderNameField = () => (
    <View style={{ marginBottom: spacing.sm }}>
      <TextField
        label={`${t("productName")} *`}
        value={form.name}
        onChangeText={handleChange("name")}
        placeholder={t("productName")}
        containerStyle={{ marginBottom: 0 }}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsList}>
          <Text style={styles.suggestionsHeader}>{t("existingProducts")}</Text>
          {filteredSuggestions.slice(0, 6).map((product) => (
            <Pressable key={product.id} style={styles.suggestionItem} onPress={() => selectExistingProduct(product)}>
              <Text style={styles.suggestionName}>{product.name}</Text>
              <Text style={styles.suggestionPrice}>TZS {Number(product.price).toFixed(2)}{product.buyingPrice ? ` / Cost: TZS ${Number(product.buyingPrice).toFixed(2)}` : ""}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const renderImagePicker = () => {
    const hasImage = !!form.image;
    return (
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={styles.fieldLabel}>{t("productImage")}</Text>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          {hasImage ? (
            <Image source={{ uri: form.image }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={22} color={colors.slate400} />
            </View>
          )}
          <View style={{ gap: 6 }}>
            <Pressable style={styles.uploadBtn} onPress={handleImagePick}>
              <Ionicons name="cloud-upload-outline" size={14} color="#2563eb" />
              <Text style={styles.uploadBtnText}>{hasImage ? t("changeImage") : t("uploadImage")}</Text>
            </Pressable>
            {hasImage && (
              <Pressable style={styles.removeBtn} onPress={() => setForm((p) => ({ ...p, image: "" }))}>
                <Ionicons name="image-off-outline" size={12} color="#dc2626" />
                <Text style={styles.removeBtnText}>{t("removeImage")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderCategorySupplier = () => (
    <>
      <ComboBox
        label={`${t("category")} *`}
        endpoint="/categories"
        value={selectedCategoryId}
        inputValue={categoryInput}
        onSelect={(id, name) => {
          setSelectedCategoryId(id);
          setCategoryInput(name || "");
        }}
        placeholder={t("selectCategory")}
        allowCreate
      />
      <ComboBox
        label={`${t("supplier")} *`}
        endpoint="/suppliers"
        value={selectedSupplierId}
        inputValue={supplierInput}
        onSelect={(id, name) => {
          setSelectedSupplierId(id);
          setSupplierInput(name || "");
          if (id) {
            const sup = suppliers.find((s) => String(s.id) === String(id));
            applySupplier(sup);
          } else {
            setSupplierCompany("");
            setSupplierContact("");
            setSupplierPayment("");
            setSupplierPayMethod("Cash");
          }
        }}
        placeholder={t("selectSupplier")}
        allowCreate
      />
    </>
  );

  const renderSupplierDetails = () => (
    <View style={{ gap: 8, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <View style={{ flex: 1 }}>
          <TextField label="Company" value={supplierCompany} onChangeText={setSupplierCompany} placeholder="Company name" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Contact" value={supplierContact} onChangeText={setSupplierContact} placeholder="+255..." />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <View style={{ flex: 1 }}>
          <TextField label="Payment Amount (TSh)" value={supplierPayment} onChangeText={setSupplierPayment} placeholder="0" keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <SelectField label="Payment Method" value={supplierPayMethod} onChange={setSupplierPayMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} searchable={false} />
        </View>
      </View>
    </View>
  );

  const renderPiecesPerUnit = () => {
    if (!PACKAGE_UNITS.includes(form.unit)) return null;
    const recommended = UNIT_RECOMMENDED[form.unit];
    return (
      <View style={{ marginBottom: spacing.sm }}>
        <TextField
          label={`Pieces per Unit (per ${form.unit})`}
          value={form.piecesPerUnit === "" || form.piecesPerUnit == null ? "" : String(form.piecesPerUnit)}
          onChangeText={handleChange("piecesPerUnit")}
          keyboardType="numeric"
          placeholder={recommended ? `e.g. ${recommended}` : "e.g. 12"}
        />
        {recommended && (
          <Text style={{ fontSize: 10, color: "#2563eb", fontWeight: "600" }}>Recommended: {recommended} pieces</Text>
        )}
      </View>
    );
  };

  const renderQuantityField = () => (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.fieldLabel}>Stock Quantity</Text>
      <QuantityInput
        value={Number(form.quantity) || 0}
        onChange={(v) => setForm((p) => ({ ...p, quantity: v }))}
        piecesPerUnit={form.piecesPerUnit}
        unit={form.unit}
        min={0}
        placeholder="e.g. 12"
      />
    </View>
  );

  const renderThresholdField = () => (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.fieldLabel}>Low Stock Alert</Text>
      <QuantityInput
        value={Number(form.lowStockThreshold) || 0}
        onChange={(v) => setForm((p) => ({ ...p, lowStockThreshold: v }))}
        piecesPerUnit={form.piecesPerUnit}
        unit={form.unit}
        min={0}
        placeholder="e.g. 10"
      />
    </View>
  );

  const updateEntry = (id, patch) => setEntryEdits((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const addNewEntry = () => {
    setEntryEdits((prev) => [...prev, { id: "new-" + Date.now(), quantityChange: 0, date: new Date().toISOString().split("T")[0], unitPrice: form.buyingPrice ?? "" }]);
  };
  const removeEntry = (id) => setEntryEdits((prev) => prev.filter((e) => e.id !== id));
  const entryTotalQty = entryEdits.reduce((s, e) => s + (Number(e.quantityChange) || 0), 0);

  const renderStockEntriesEditor = () => {
    if (entryEdits.length === 0) {
      return (
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={styles.fieldLabel}>{t("stockEntries")}</Text>
          <Text style={{ fontSize: 11, color: colors.slate400 }}>{t("noStockEntries")}</Text>
          <Pressable style={styles.addEntryBtn} onPress={addNewEntry}>
            <Ionicons name="add" size={12} color="#2563eb" />
            <Text style={styles.addEntryBtnText}>{t("addEntry")}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={styles.fieldLabel}>{t("stockEntries")}</Text>
        <View style={styles.entriesCard}>
          <View style={styles.entriesHeader}>
            <Text style={styles.entryHeaderText}>{t("qty")}</Text>
            <Text style={styles.entryHeaderText}>{t("buyingPrice")}</Text>
            <Text style={styles.entryHeaderText}>{t("date")}</Text>
            <View style={{ width: 30 }} />
          </View>
          {entryEdits.map((e) => (
            <View key={e.id} style={styles.entryRow}>
              <View style={{ flex: 0.7, padding: 4 }}>
                <TextField
                  value={e.quantityChange === 0 && e.id && !e._touched ? "" : String(e.quantityChange)}
                  onChangeText={(v) => updateEntry(e.id, { quantityChange: v, _touched: true })}
                  keyboardType="numeric"
                  placeholder="0"
                  inputStyle={{ fontSize: 11, paddingVertical: 4, minHeight: 30 }}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <View style={{ flex: 0.8, padding: 4 }}>
                <TextField
                  value={e.unitPrice != null ? String(e.unitPrice) : ""}
                  onChangeText={(v) => updateEntry(e.id, { unitPrice: v })}
                  keyboardType="numeric"
                  placeholder="0"
                  inputStyle={{ fontSize: 11, paddingVertical: 4, minHeight: 30 }}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <View style={{ flex: 0.8, padding: 4 }}>
                <TextField
                  value={e.date || ""}
                  onChangeText={(v) => updateEntry(e.id, { date: v })}
                  placeholder="YYYY-MM-DD"
                  inputStyle={{ fontSize: 11, paddingVertical: 4, minHeight: 30 }}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <Pressable style={{ padding: 6, justifyContent: "center" }} onPress={() => removeEntry(e.id)}>
                <Ionicons name="close" size={12} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <Pressable style={styles.addEntryBtn} onPress={addNewEntry}>
            <Ionicons name="add" size={12} color="#2563eb" />
            <Text style={styles.addEntryBtnText}>{t("addEntry")}</Text>
          </Pressable>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.slate900 }}>
            {t("totalStock")}: <Text style={{ color: "#2563eb" }}>{entryTotalQty}</Text>
          </Text>
        </View>
      </View>
    );
  };

  const fields = [
    { name: "price", label: t("productPrice"), type: "number", required: true },
    { name: "buyingPrice", label: t("buyingPrice"), type: "number" },
    { name: "discount", label: "Discount", type: "number" },
    { name: "discountType", label: "Discount Type", type: "select", options: [{ value: "percent", label: "%" }, { value: "fixed", label: "TZS (Fixed)" }] },
    { name: "unit", label: "Unit", type: "select", options: UNIT_OPTIONS.map((u) => ({ value: u, label: u.charAt(0).toUpperCase() + u.slice(1) })) },
    { name: "expiryDate", label: t("expiryDate"), type: "date" },
  ];

  const commonFormFields = () => (
    <>
      {renderNameField()}
      {renderImagePicker()}
      {renderCategorySupplier()}
      {renderSupplierDetails()}
      {renderField(fields[0])}
      {renderField(fields[1])}
      {renderField(fields[2])}
      {renderField(fields[3])}
      {renderField(fields[4])}
      {renderPiecesPerUnit()}
      {renderField(fields[5])}
    </>
  );

  if (loading && editId) return <View style={styles.centerBox}><Text style={{ color: colors.slate500 }}>{t("loading")}</Text></View>;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Ionicons name="cube-outline" size={20} color="#2563eb" />
          <Text style={styles.topBarTitle}>{editId ? t("editProduct") : t("addProduct")}</Text>
        </View>
        <Button variant="outline" size="sm" title={t("cancel")} onPress={() => nav(fromStock ? "/stock" : "/products")}
          icon={<Ionicons name="close" size={12} color={colors.slate700} />} />
      </View>

      {message.text && (
        <View style={[styles.msgBox, message.type === "error" ? styles.msgError : styles.msgSuccess]}>
          <Text style={{ fontSize: 12, color: message.type === "error" ? "#991b1b" : "#166534" }}>{message.text}</Text>
        </View>
      )}

      {editId ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formCard}>
            {commonFormFields()}
            {renderStockEntriesEditor()}
            {renderThresholdField()}
            <TextField label="Date Added" value={form.date} onChangeText={handleChange("date")} placeholder="YYYY-MM-DD" />

            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Button title={loading ? t("saving") : t("update")} variant="primary" loading={loading} onPress={handleEditSubmit} style={{ flex: 1 }} />
              <Button title={t("cancel")} variant="outline" onPress={() => nav(fromStock ? "/stock" : "/products")} />
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.twoCol}>
          <ScrollView style={styles.leftCol} contentContainerStyle={styles.leftColContent}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="add" size={13} color="#2563eb" /> {t("addProduct")}
            </Text>
            {commonFormFields()}
            {renderQuantityField()}
            {renderThresholdField()}
            <TextField label="Date Added" value={form.date} onChangeText={handleChange("date")} placeholder="YYYY-MM-DD" />
            <Button title={`${t("addToList")}`} variant="success" onPress={addToList}
              icon={<Ionicons name="add" size={13} color="#fff" />} style={{ marginTop: 4 }} />
          </ScrollView>

          <View style={styles.rightCol}>
            <View style={styles.rightTopRow}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="cube-outline" size={14} color="#2563eb" /> {t("pendingProducts")}
                {pendingProducts.length > 0 && <Text style={{ color: colors.slate400, fontSize: 11, fontWeight: "400" }}> ({pendingProducts.length})</Text>}
              </Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {pendingProducts.length > 0 && (
                  <>
                    <Button size="sm" variant="dangerGhost" title={t("clearList")} onPress={clearList}
                      icon={<Ionicons name="trash-outline" size={11} color="#dc2626" />} />
                    <Button size="sm" title={loading ? t("saving") : t("saveAll")} loading={loading} onPress={saveAll}
                      icon={<Ionicons name="save-outline" size={11} color="#fff" />} />
                  </>
                )}
              </View>
            </View>

            <View style={styles.pendingCard}>
              {pendingProducts.length === 0 ? (
                <View style={styles.pendingEmpty}>
                  <Ionicons name="cube-outline" size={28} color={colors.slate300} />
                  <Text style={{ color: colors.slate400, fontSize: 12 }}>{t("noPendingProducts")}</Text>
                  <Text style={{ color: colors.slate400, fontSize: 12 }}>{t("addItemsToGetStarted")}</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={{ padding: 8 }}>
                  {pendingProducts.map((p, idx) => (
                    <View key={p.id} style={styles.pendingRow}>
                      <Text style={[styles.pendingCell, { width: 24, textAlign: "center", color: colors.slate400 }]}>{idx + 1}</Text>
                      <Text style={[styles.pendingCell, { flex: 1.2, fontWeight: "600" }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[styles.pendingCell, { width: 60 }]}>
                        <Text style={styles.pendingChip}>{p.categoryName || "—"}</Text>
                      </Text>
                      <Text style={[styles.pendingCell, { width: 60 }]} numberOfLines={1}>
                        {p.supplierName || "—"}
                      </Text>
                      <Text style={[styles.pendingCell, { width: 50 }]}>
                        <Text style={styles.pendingChip}>{p.unit || "piece"}</Text>
                      </Text>
                      <Text style={[styles.pendingCell, { width: 70, textAlign: "right", fontWeight: "600" }]}>TZS {Number(p.price).toFixed(2)}</Text>
                      <Text style={[styles.pendingCell, { width: 70, textAlign: "right", color: colors.slate500 }]}>TZS {Number(p.buyingPrice || 0).toFixed(2)}</Text>
                      <Text style={[styles.pendingCell, { width: 50, textAlign: "right" }]}>
                        {Number(p.discount || 0) > 0 ? <Text style={{ color: "#dc2626", fontSize: 10, fontWeight: "600" }}>{p.discountType === "percent" ? `${p.discount}%` : `TZS ${p.discount}`}</Text> : "—"}
                      </Text>
                      <Text style={[styles.pendingCell, { width: 60, textAlign: "right", color: colors.slate500, fontSize: 10 }]}>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "—"}</Text>
                      <Text style={[styles.pendingCell, { width: 40, textAlign: "right", fontWeight: "600" }]}>{p.quantity || 0}</Text>
                      <Pressable style={{ padding: 4 }} onPress={() => removeFromList(p.id)}>
                        <Ionicons name="close" size={12} color="#ef4444" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.sm },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  topBarTitle: { fontSize: 16, fontWeight: "700", color: colors.slate900 },
  msgBox: { padding: 10, borderRadius: 6, marginBottom: 8 },
  msgError: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  msgSuccess: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  scrollContent: { paddingBottom: 20 },
  formCard: {
    backgroundColor: "#fff", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.slate200,
    maxWidth: 560, ...shadow.card,
  },
  twoCol: { flex: 1, flexDirection: "row", gap: 14 },
  leftCol: { width: 320, flexGrow: 0 },
  leftColContent: { paddingBottom: 20 },
  rightCol: { flex: 1, minWidth: 0 },
  rightTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.slate900, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: "#374151", marginBottom: 4 },
  suggestionsList: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, marginTop: 4,
    maxHeight: 180, overflow: "hidden", ...shadow.raised,
  },
  suggestionsHeader: { padding: 8, fontSize: 11, color: colors.slate400, fontWeight: "600", textTransform: "uppercase", backgroundColor: "#f8fafc" },
  suggestionItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.slate100 },
  suggestionName: { fontWeight: "500", fontSize: 13, color: colors.slate700 },
  suggestionPrice: { color: colors.slate500, fontSize: 11 },
  imagePreview: { width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderColor: colors.slate200 },
  imagePlaceholder: { width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: "#d1d5db", backgroundColor: colors.slate50, alignItems: "center", justifyContent: "center" },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: "#eff6ff", borderRadius: 6, borderWidth: 1, borderColor: "#bfdbfe" },
  uploadBtnText: { color: "#2563eb", fontWeight: "600", fontSize: 11 },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: "#fef2f2", borderRadius: 6, borderWidth: 1, borderColor: "#fecaca" },
  removeBtnText: { color: "#dc2626", fontWeight: "600", fontSize: 11 },
  addEntryBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: "#eff6ff", borderRadius: 6, borderWidth: 1, borderColor: "#bfdbfe", alignSelf: "flex-start" },
  addEntryBtnText: { color: "#2563eb", fontWeight: "600", fontSize: 11 },
  entriesCard: { borderWidth: 1, borderColor: colors.slate200, borderRadius: 8, overflow: "hidden" },
  entriesHeader: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: colors.slate200, paddingVertical: 5, paddingHorizontal: 8 },
  entryHeaderText: { fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", flex: 1 },
  entryRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  pendingCard: { flex: 1, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: colors.slate200, overflow: "hidden", minHeight: 200 },
  pendingEmpty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 6 },
  pendingRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingVertical: 6 },
  pendingCell: { fontSize: 11, color: colors.slate700, paddingHorizontal: 4 },
  pendingChip: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: 99, fontSize: 10, backgroundColor: colors.slate100, color: "#475569" },
});