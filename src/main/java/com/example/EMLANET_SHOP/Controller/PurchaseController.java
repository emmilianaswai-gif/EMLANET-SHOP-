package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Purchase;
import com.example.EMLANET_SHOP.Service.PurchaseService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

    private final PurchaseService purchaseService;

    public PurchaseController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @PostMapping
    public Purchase create(@RequestBody Purchase purchase) {
        return purchaseService.savePurchase(purchase);
    }

    @PutMapping("/{id}")
    public Purchase update(@PathVariable Long id, @RequestBody Purchase purchase) {
        return purchaseService.updatePurchase(id, purchase);
    }

    @GetMapping
    public List<Purchase> getAll() {
        return purchaseService.getAll();
    }

    @GetMapping("/{id}")
    public Purchase getById(@PathVariable Long id) {
        return purchaseService.getPurchaseById(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        purchaseService.deletePurchaseById(id);
    }
}
