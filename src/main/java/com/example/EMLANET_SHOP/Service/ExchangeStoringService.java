package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.ExchangeStoring;

import java.util.List;

public interface ExchangeStoringService {
    ExchangeStoring save(ExchangeStoring exchange);
    ExchangeStoring getById(Long id);
    List<ExchangeStoring> getAll();
    List<ExchangeStoring> getByStatus(String status);
    List<ExchangeStoring> getByType(String type);
    ExchangeStoring updateStatus(Long id, String status);
    void delete(Long id);
}
