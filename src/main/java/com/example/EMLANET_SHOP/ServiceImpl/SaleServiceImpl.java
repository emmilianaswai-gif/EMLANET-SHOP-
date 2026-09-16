package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Config.TenantContext;
import com.example.EMLANET_SHOP.Entity.Product;
import com.example.EMLANET_SHOP.Entity.Sale;
import com.example.EMLANET_SHOP.Entity.SaleItem;
import com.example.EMLANET_SHOP.Exception.ResourceNotFoundException;
import com.example.EMLANET_SHOP.Repository.PaymentRepository;
import com.example.EMLANET_SHOP.Repository.ProductRepository;
import com.example.EMLANET_SHOP.Repository.SaleRepository;
import com.example.EMLANET_SHOP.Service.SaleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class SaleServiceImpl implements SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;

    public SaleServiceImpl(SaleRepository saleRepository, ProductRepository productRepository, PaymentRepository paymentRepository) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
    }

    @Override
    @Transactional
    public Sale save(Sale sale) {
        if (sale.getSaleItems() != null) {
            sale.getSaleItems().forEach(item -> {
                item.setSale(sale);
                if (item.getProduct() != null && item.getProduct().getId() != null) {
                    Product product = productRepository.findById(item.getProduct().getId()).orElse(null);
                    if (product != null && product.getBuyingPrice() != null) {
                        item.setCostPrice(product.getBuyingPrice());
                    }
                }
            });
        }
        return saleRepository.save(sale);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Sale> getAll() {
        return saleRepository.findAllWithItems();
    }

    @Override
    @Transactional(readOnly = true)
    public Sale getSaleById(Long id) {
        Sale sale = saleRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found"));
        return sale;
    }

    @Override
    @Transactional
    public void deleteSaleById(Long id) {
        if (!saleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Sale not found");
        }
        paymentRepository.deleteBySaleId(id);
        saleRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Sale> getRecentSales() {
        return saleRepository.findTop10WithItems();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDailyRevenue(LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = saleRepository.findDailyRevenueBetween(TenantContext.getShopId(), start, end);
        List<Map<String, Object>> dailyRevenue = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("date", row[0] != null ? row[0].toString() : null);
            entry.put("total", row[1] != null ? ((Number) row[1]).doubleValue() : 0.0);
            dailyRevenue.add(entry);
        }
        return dailyRevenue;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMonthlyRevenue(LocalDateTime start, LocalDateTime end) {
        List<Object[]> results = saleRepository.findMonthlyRevenueBetween(TenantContext.getShopId(), start, end);
        List<Map<String, Object>> monthlyRevenue = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("month", row[0] != null ? ((Number) row[0]).intValue() : 0);
            entry.put("year", row[1] != null ? ((Number) row[1]).intValue() : 0);
            entry.put("total", row[2] != null ? ((Number) row[2]).doubleValue() : 0.0);
            monthlyRevenue.add(entry);
        }
        return monthlyRevenue;
    }
}
