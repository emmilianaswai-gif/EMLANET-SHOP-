package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Transaction;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface TransactionService {
    Transaction save(Transaction transaction);
    Transaction getById(Long id);
    List<Transaction> getAll();
    List<Transaction> getByType(String type);
    List<Transaction> getByDateRange(LocalDateTime start, LocalDateTime end);
    List<Map<String, Object>> getTransactionSummary(LocalDateTime start, LocalDateTime end);
    void delete(Long id);
}
