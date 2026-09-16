package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.StockHistory;
import com.example.EMLANET_SHOP.Service.StockHistoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock-history")
public class StockHistoryController {

    private final StockHistoryService stockHistoryService;

    public StockHistoryController(StockHistoryService stockHistoryService) {
        this.stockHistoryService = stockHistoryService;
    }

    @PostMapping
    public StockHistory save(@RequestBody StockHistory stockHistory) {
        return stockHistoryService.saveStockHistory(stockHistory);
    }

    @GetMapping
    public List<StockHistory> getAll() {
        return stockHistoryService.getAll();
    }

    @GetMapping("/{id}")
    public StockHistory getById(@PathVariable Long id) {
        return stockHistoryService.getStockHistoryById(id);
    }

    @GetMapping("/product/{productId}")
    public List<StockHistory> getByProductId(@PathVariable Long productId) {
        return stockHistoryService.getByProductId(productId);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        stockHistoryService.deleteStockHistoryById(id);
    }
}
