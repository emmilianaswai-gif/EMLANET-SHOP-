package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.StockHistory;
import com.example.EMLANET_SHOP.Exception.ResourceNotFoundException;
import com.example.EMLANET_SHOP.Repository.StockHistoryRepository;
import com.example.EMLANET_SHOP.Service.StockHistoryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class StockHistoryServiceImpl implements StockHistoryService {

    private final StockHistoryRepository stockHistoryRepository;

    public StockHistoryServiceImpl(StockHistoryRepository stockHistoryRepository) {
        this.stockHistoryRepository = stockHistoryRepository;
    }

    @Override
    @Transactional
    public StockHistory saveStockHistory(StockHistory stockHistory) {
        return stockHistoryRepository.save(stockHistory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockHistory> getAll() {
        return stockHistoryRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public StockHistory getStockHistoryById(Long id) {
        return stockHistoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock history not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockHistory> getByProductId(Long productId) {
        return stockHistoryRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }

    @Override
    @Transactional
    public void deleteStockHistoryById(Long id) {
        if (!stockHistoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Stock history not found");
        }
        stockHistoryRepository.deleteById(id);
    }
}
