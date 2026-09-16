package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Stock;

import java.util.List;

public interface StockService {
    Stock save(Stock stock);
    List<Stock> getAll();
    Stock getById(Long id);
    Stock update(Long id, Stock stock);
    void delete(Long id);
    Stock getByProductId(Long productId);
}
