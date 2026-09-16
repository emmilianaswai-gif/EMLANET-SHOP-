package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Category;
import com.example.EMLANET_SHOP.Entity.Product;
import com.example.EMLANET_SHOP.Entity.Supplier;
import com.example.EMLANET_SHOP.Service.ProductService;
import com.example.EMLANET_SHOP.Service.CategoryService;
import com.example.EMLANET_SHOP.Service.SupplierService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final CategoryService categoryService;
    private final SupplierService supplierService;

    public ProductController(ProductService productService, CategoryService categoryService, SupplierService supplierService){
        this.productService = productService;
        this.categoryService = categoryService;
        this.supplierService = supplierService;
    }

    @PostMapping
    public Product save(@RequestBody Map<String, Object> payload) {
        Product product = new Product();
        if (payload.containsKey("name")) product.setName((String) payload.get("name"));
        if (payload.containsKey("price")) product.setPrice(Double.parseDouble(payload.get("price").toString()));
        if (payload.containsKey("buyingPrice")) product.setBuyingPrice(Double.parseDouble(payload.get("buyingPrice").toString()));
        if (payload.containsKey("expiryDate")) {
            Object expiryObj = payload.get("expiryDate");
            if (expiryObj != null && !expiryObj.toString().isBlank()) {
                product.setExpiryDate(LocalDate.parse(expiryObj.toString()));
            }
        }
        if (payload.containsKey("categoryId")) {
            Object catObj = payload.get("categoryId");
            if (catObj != null && !catObj.toString().isBlank()) {
                Long categoryId = Long.parseLong(catObj.toString());
                product.setCategory(categoryService.getCategoryById(categoryId));
            }
        }
        if (payload.containsKey("supplierId")) {
            Object supObj = payload.get("supplierId");
            if (supObj != null && !supObj.toString().isBlank()) {
                Long supplierId = Long.parseLong(supObj.toString());
                product.setSupplier(supplierService.getSupplierById(supplierId));
            }
        }
        if (payload.containsKey("sku")) product.setSku((String) payload.get("sku"));
        if (payload.containsKey("unit")) product.setUnit((String) payload.get("unit"));
        if (payload.containsKey("piecesPerUnit")) {
            Object ppu = payload.get("piecesPerUnit");
            product.setPiecesPerUnit(ppu == null || ppu.toString().isBlank() ? null : Integer.parseInt(ppu.toString()));
        }
        if (payload.containsKey("quantity")) product.setQuantity(Integer.parseInt(payload.get("quantity").toString()));
        if (payload.containsKey("discount")) product.setDiscount(Double.parseDouble(payload.get("discount").toString()));
        if (payload.containsKey("discountType")) product.setDiscountType((String) payload.get("discountType"));
        return productService.save(product);
    }

    @GetMapping
    public List<Product> getAll(){
        return productService.getAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        Product product = productService.getProductById(id);
        if (product == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(product);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload // Using a Map prevents Jackson crash on missing mappings
    ){
        try {
            Product old = productService.getProductById(id);
            if (old == null) {
                return ResponseEntity.notFound().build();
            }

            // 1. Map standard primitive fields cleanly safely checking for nulls
            if (payload.containsKey("name")) old.setName((String) payload.get("name"));
            if (payload.containsKey("price")) old.setPrice(Double.parseDouble(payload.get("price").toString()));
            if (payload.containsKey("buyingPrice")) old.setBuyingPrice(Double.parseDouble(payload.get("buyingPrice").toString()));
            if (payload.containsKey("expiryDate")) {
                Object expiryObj = payload.get("expiryDate");
                if (expiryObj == null || expiryObj.toString().isBlank()) {
                    old.setExpiryDate(null);
                } else {
                    old.setExpiryDate(LocalDate.parse(expiryObj.toString()));
                }
            }

            // 2. Map structural Relationships securely
            // Handle categoryId specifically. Allow null/blank to clear category (uncategorized)
            if (payload.containsKey("categoryId")) {
                Object catObj = payload.get("categoryId");
                if (catObj == null || catObj.toString().isBlank()) {
                    // Clear category -> product becomes uncategorized
                    old.setCategory(null);
                } else {
                    try {
                        Long categoryId = Long.parseLong(catObj.toString());
                        Category category = categoryService.getCategoryById(categoryId);
                        old.setCategory(category);
                    } catch (NumberFormatException nfe) {
                        return ResponseEntity.badRequest().body("Invalid categoryId format");
                    } catch (RuntimeException notFound) {
                        // CategoryService throws when not found
                        return ResponseEntity.status(404).body("Category not found");
                    }
                }
            }

            if (payload.containsKey("supplierId")) {
                Object supObj = payload.get("supplierId");
                if (supObj == null || supObj.toString().isBlank()) {
                    old.setSupplier(null);
                } else {
                    try {
                        Long supplierId = Long.parseLong(supObj.toString());
                        Supplier supplier = supplierService.getSupplierById(supplierId);
                        old.setSupplier(supplier);
                    } catch (NumberFormatException nfe) {
                        return ResponseEntity.badRequest().body("Invalid supplierId format");
                    } catch (RuntimeException notFound) {
                        return ResponseEntity.status(404).body("Supplier not found");
                    }
                }
            }

            if (payload.containsKey("sku")) old.setSku((String) payload.get("sku"));
            if (payload.containsKey("unit")) old.setUnit((String) payload.get("unit"));
            if (payload.containsKey("piecesPerUnit")) {
                Object ppu = payload.get("piecesPerUnit");
                old.setPiecesPerUnit(ppu == null || ppu.toString().isBlank() ? null : Integer.parseInt(ppu.toString()));
            }
            if (payload.containsKey("quantity")) old.setQuantity(Integer.parseInt(payload.get("quantity").toString()));
            if (payload.containsKey("discount")) old.setDiscount(Double.parseDouble(payload.get("discount").toString()));
            if (payload.containsKey("discountType")) old.setDiscountType((String) payload.get("discountType"));

            Product updatedProduct = productService.save(old);
            return ResponseEntity.ok(updatedProduct);

        } catch (Exception e) {
            // This will send back the actual reason to your frontend screen log now!
            return ResponseEntity.status(500).body("Backend Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            productService.deleteProductById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Backend Error: " + e.getMessage());
        }
    }
}