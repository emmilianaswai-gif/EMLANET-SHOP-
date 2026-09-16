package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Stock;
import com.example.EMLANET_SHOP.Exception.ResourceNotFoundException;
import com.example.EMLANET_SHOP.Repository.StockRepository;
import com.example.EMLANET_SHOP.Service.StockService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class StockServiceImpl implements StockService {

    private final StockRepository stockRepository;

    public StockServiceImpl(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    @Override
    @Transactional
    public Stock save(Stock stock) {
        if (stock.getProduct() != null && stock.getProduct().getId() != null) {
            Optional<Stock> existing = stockRepository.findByProductId(stock.getProduct().getId());
            if (existing.isPresent()) {
                Stock s = existing.get();
                s.setQuantity(stock.getQuantity());
                if (stock.getLowStockThreshold() != null) s.setLowStockThreshold(stock.getLowStockThreshold());
                if (stock.getProductName() != null && !stock.getProductName().isBlank()) s.setProductName(stock.getProductName());
                if (stock.getDate() != null && !stock.getDate().isBlank()) s.setDate(stock.getDate());
                if (stock.getChangeType() != null) s.setChangeType(stock.getChangeType());
                if (stock.getExpiryDate() != null) s.setExpiryDate(stock.getExpiryDate());
                if (stock.getDate() != null && !stock.getDate().isBlank()) s.setDate(stock.getDate());
                return stockRepository.save(s);
            }
        }
        if (stock.getProductName() == null || stock.getProductName().isBlank()) {
            if (stock.getProduct() != null && stock.getProduct().getName() != null) {
                stock.setProductName(stock.getProduct().getName());
            } else {
                stock.setProductName("");
            }
        }
        if (stock.getDate() == null || stock.getDate().isBlank()) {
            stock.setDate(java.time.LocalDate.now().toString());
        }
        if (stock.getChangeType() == null) {
            stock.setChangeType("Added");
        }
        return stockRepository.save(stock);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Stock> getAll() {
        return stockRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Stock getById(Long id) {
        return stockRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found"));
    }

    @Override
    @Transactional
    public Stock update(Long id, Stock updated) {
        Stock existing = stockRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found"));
        if (updated.getProduct() != null) existing.setProduct(updated.getProduct());
        existing.setQuantity(updated.getQuantity());
        existing.setLowStockThreshold(updated.getLowStockThreshold());
        if (updated.getProductName() != null && !updated.getProductName().isBlank()) existing.setProductName(updated.getProductName());
        if (updated.getDate() != null && !updated.getDate().isBlank()) existing.setDate(updated.getDate());
        if (updated.getExpiryDate() != null) existing.setExpiryDate(updated.getExpiryDate());
        return stockRepository.save(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public Stock getByProductId(Long productId) {
        return stockRepository.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found for this product"));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!stockRepository.existsById(id)) {
            throw new ResourceNotFoundException("Stock not found");
        }
        stockRepository.deleteById(id);
    }
}
