package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Stock;
import com.example.EMLANET_SHOP.Service.StockService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping
    public List<Stock> getAllStocks() {
        return stockService.getAll();
    }

    @GetMapping("/{id}")
    public Stock getStock(@PathVariable Long id) {
        return stockService.getById(id);
    }

    @PostMapping
    public Stock createStock(@RequestBody Stock stock) {
        return stockService.save(stock);
    }

    @GetMapping("/product/{productId}")
    public Stock getStockByProductId(@PathVariable Long productId) {
        return stockService.getByProductId(productId);
    }

    @PutMapping("/{id}")
    public Stock updateStock(@PathVariable Long id, @RequestBody Stock stock) {
        return stockService.update(id, stock);
    }

    @DeleteMapping("/{id}")
    public void deleteStock(@PathVariable Long id) {
        stockService.delete(id);
    }
}
