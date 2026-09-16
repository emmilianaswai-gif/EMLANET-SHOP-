package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Sale;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface SaleService {

    Sale save(Sale sale);

    List<Sale> getAll();

    Sale getSaleById(Long id);

    void deleteSaleById(Long id);

    List<Sale> getRecentSales();

    List<Map<String, Object>> getDailyRevenue(LocalDateTime start, LocalDateTime end);

    List<Map<String, Object>> getMonthlyRevenue(LocalDateTime start, LocalDateTime end);
}
