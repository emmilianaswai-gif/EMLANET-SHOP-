package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Product;
import com.example.EMLANET_SHOP.Repository.*;
import com.example.EMLANET_SHOP.Service.ProductService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final StockRepository stockRepository;
    private final StockHistoryRepository stockHistoryRepository;
    private final SaleItemRepository saleItemRepository;
    private final PurchasesItemRepository purchasesItemRepository;
    private final ExchangeStoringRepository exchangeStoringRepository;

    public ProductServiceImpl(ProductRepository productRepository, StockRepository stockRepository,
                              StockHistoryRepository stockHistoryRepository, SaleItemRepository saleItemRepository,
                              PurchasesItemRepository purchasesItemRepository, ExchangeStoringRepository exchangeStoringRepository) {
        this.productRepository = productRepository;
        this.stockRepository = stockRepository;
        this.stockHistoryRepository = stockHistoryRepository;
        this.saleItemRepository = saleItemRepository;
        this.purchasesItemRepository = purchasesItemRepository;
        this.exchangeStoringRepository = exchangeStoringRepository;
    }

    @Override
    public Product save(Product product) {
        return productRepository.save(product);
    }

    @Override
    public List<Product> getAll() {
        return productRepository.findAll();
    }

    @Override
    public Product getProductById(long id) {
        Optional<Product> opt = productRepository.findById(id);
        return opt.orElse(null);
    }

    @Override
    @Transactional
    public void deleteProductById(long id) {
        Product product = productRepository.findById(id).orElseThrow(() -> new RuntimeException("Product not found"));
        stockRepository.findByProductId(id).ifPresent(stockRepository::delete);
        stockHistoryRepository.deleteByProductId(id);
        saleItemRepository.deleteByProductId(id);
        purchasesItemRepository.deleteByProductId(id);
        exchangeStoringRepository.deleteByProductId(id);
        productRepository.deleteById(id);
    }

    @Override
    public List<Product> getExpiringProducts(int daysAhead) {
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(daysAhead);
        return productRepository.findByExpiryDateBetween(start, end);
    }

    @Override
    public List<Product> getExpiredProducts() {
        LocalDate today = LocalDate.now();
        return productRepository.findExpiredProducts(today);
    }
}
