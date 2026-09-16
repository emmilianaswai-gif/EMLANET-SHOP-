package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Transaction;
import com.example.EMLANET_SHOP.Repository.TransactionRepository;
import com.example.EMLANET_SHOP.Service.TransactionService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository repo;

    public TransactionServiceImpl(TransactionRepository repo) {
        this.repo = repo;
    }

    @Override
    public Transaction save(Transaction transaction) {
        return repo.save(transaction);
    }

    @Override
    public Transaction getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));
    }

    @Override
    public List<Transaction> getAll() {
        return repo.findAll();
    }

    @Override
    public List<Transaction> getByType(String type) {
        return repo.findByType(type);
    }

    @Override
    public List<Transaction> getByDateRange(LocalDateTime start, LocalDateTime end) {
        return repo.findByTransactionDateBetween(start, end);
    }

    @Override
    public List<Map<String, Object>> getTransactionSummary(LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = repo.getTransactionSummaryByType(start, end);
        List<Map<String, Object>> summary = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("type", row[0] != null ? row[0].toString() : null);
            entry.put("total", row[1] != null ? ((Number) row[1]).doubleValue() : 0.0);
            summary.add(entry);
        }
        return summary;
    }

    @Override
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("Transaction not found with id: " + id);
        }
        repo.deleteById(id);
    }
}
