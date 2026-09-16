package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.SaleItem;
import com.example.EMLANET_SHOP.Repository.SaleItemRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sale-items")
public class SaleItemController {

    private final SaleItemRepository repo;

    public SaleItemController(SaleItemRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<SaleItem> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public SaleItem getById(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("SaleItem not found"));
    }

    @PostMapping
    public SaleItem save(@RequestBody SaleItem item) {
        return repo.save(item);
    }

    @PutMapping("/{id}")
    public SaleItem update(@PathVariable Long id, @RequestBody SaleItem item) {
        SaleItem existing = repo.findById(id).orElseThrow(() -> new RuntimeException("SaleItem not found"));
        existing.setQuantity(item.getQuantity());
        existing.setPrice(item.getPrice());
        return repo.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
