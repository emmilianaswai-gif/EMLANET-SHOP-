package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.PurchasesItem;
import com.example.EMLANET_SHOP.Repository.PurchasesItemRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-items")
public class PurchasesItemController {

    private final PurchasesItemRepository repo;

    public PurchasesItemController(PurchasesItemRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<PurchasesItem> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public PurchasesItem getById(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("PurchasesItem not found"));
    }

    @PostMapping
    public PurchasesItem save(@RequestBody PurchasesItem item) {
        return repo.save(item);
    }

    @PutMapping("/{id}")
    public PurchasesItem update(@PathVariable Long id, @RequestBody PurchasesItem item) {
        PurchasesItem existing = repo.findById(id).orElseThrow(() -> new RuntimeException("PurchasesItem not found"));
        existing.setQuantity(item.getQuantity());
        existing.setCostPrice(item.getCostPrice());
        return repo.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
