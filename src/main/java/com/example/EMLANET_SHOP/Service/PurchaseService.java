package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Purchase;

import java.util.List;

public interface PurchaseService {

    Purchase savePurchase(Purchase purchase);

    Purchase updatePurchase(Long id, Purchase purchase);

    List<Purchase> getAll();

    Purchase getPurchaseById(Long id);

    void deletePurchaseById(Long id);
}
