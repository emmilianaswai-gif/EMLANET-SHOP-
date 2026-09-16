package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Transaction;
import com.example.EMLANET_SHOP.Service.TransactionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
    }

    @PostMapping
    public Transaction create(@RequestBody Transaction transaction) {
        return service.save(transaction);
    }

    @GetMapping
    public List<Transaction> getAll(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        if (type != null && !type.isEmpty()) {
            return service.getByType(type);
        }
        if (startDate != null && endDate != null) {
            return service.getByDateRange(startDate, endDate);
        }
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Transaction getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/summary")
    public List<Map<String, Object>> getSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return service.getTransactionSummary(startDate, endDate);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
