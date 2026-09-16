package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.StockHistory;

import java.util.List;

public interface StockHistoryService {
    StockHistory saveStockHistory(StockHistory stockHistory);
    List<StockHistory> getAll();
    StockHistory getStockHistoryById(Long id);
    List<StockHistory> getByProductId(Long productId);
    void deleteStockHistoryById(Long id);
}
