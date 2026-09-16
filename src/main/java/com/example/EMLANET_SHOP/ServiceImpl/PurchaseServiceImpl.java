package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Purchase;
import com.example.EMLANET_SHOP.Repository.PurchaseRepository;
import com.example.EMLANET_SHOP.Service.PurchaseService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PurchaseServiceImpl implements PurchaseService {

    private final PurchaseRepository purchaseRepository;

    public PurchaseServiceImpl(PurchaseRepository purchaseRepository) {
        this.purchaseRepository = purchaseRepository;
    }

    @Override
    @Transactional
    public Purchase savePurchase(Purchase purchase) {
        return purchaseRepository.save(purchase);
    }

    @Override
    @Transactional
    public Purchase updatePurchase(Long id, Purchase purchase) {
        return purchaseRepository.findById(id)
                .map(existing -> {
                    if (purchase.getProductName() != null) existing.setProductName(purchase.getProductName());
                    if (purchase.getQuantity() != null) existing.setQuantity(purchase.getQuantity());
                    if (purchase.getUnitPrice() != null) existing.setUnitPrice(purchase.getUnitPrice());
                    if (purchase.getTotalAmount() != null) existing.setTotalAmount(purchase.getTotalAmount());
                    if (purchase.getDescription() != null) existing.setDescription(purchase.getDescription());
                    if (purchase.getStatus() != null) existing.setStatus(purchase.getStatus());
                    if (purchase.getPaymentStatus() != null) existing.setPaymentStatus(purchase.getPaymentStatus());
                    if (purchase.getSupplier() != null) existing.setSupplier(purchase.getSupplier());
                    return purchaseRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Purchase not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Purchase> getAll() {
        return purchaseRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Purchase getPurchaseById(Long id) {
        return purchaseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase not found with id: " + id));
    }

    @Override
    @Transactional
    public void deletePurchaseById(Long id) {
        purchaseRepository.deleteById(id);
    }
}
