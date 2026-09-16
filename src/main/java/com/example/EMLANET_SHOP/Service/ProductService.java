package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Product;
import java.util.List;

public interface ProductService {
    Product save(Product product);
    List<Product> getAll();
    Product getProductById(long id);
    void deleteProductById(long id);

    // Methods aligned with controllers usage
    List<Product> getExpiringProducts(int daysAhead);
    List<Product> getExpiredProducts();
}