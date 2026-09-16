package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Config.TenantContext;
import com.example.EMLANET_SHOP.Entity.Expense;
import com.example.EMLANET_SHOP.Entity.Product;
import com.example.EMLANET_SHOP.Entity.Sale;
import com.example.EMLANET_SHOP.Entity.Stock;
import com.example.EMLANET_SHOP.Repository.*;
import com.example.EMLANET_SHOP.Service.ExpenseService;
import com.example.EMLANET_SHOP.Service.ProductService;
import com.example.EMLANET_SHOP.Service.SaleService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final SaleService saleService;
    private final ProductService productService;
    private final ExpenseService expenseService;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final SaleItemRepository saleItemRepository;
    private final StockRepository stockRepository;

    public DashboardController(SaleService saleService,
                               ProductService productService,
                               ExpenseService expenseService,
                               CustomerRepository customerRepository,
                               SupplierRepository supplierRepository,
                               SaleItemRepository saleItemRepository,
                               StockRepository stockRepository) {
        this.saleService = saleService;
        this.productService = productService;
        this.expenseService = expenseService;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
        this.saleItemRepository = saleItemRepository;
        this.stockRepository = stockRepository;
    }

    private static double applyAsDouble(Sale s) {
        if (s == null) return 0.0;
        try {
            Object priceObj = s.getGrandTotal();
            if (priceObj == null) return 0.0;
            if (priceObj instanceof Number) {
                return ((Number) priceObj).doubleValue();
                
            }
            // Fallback if price is stored as String or other type
            return Double.parseDouble(priceObj.toString());
        } catch (Exception ex) {
            return 0.0;
        }
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        Map<String, Object> summary = new HashMap<>();

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        List<Sale> todaySales = saleService.getAll().stream()
                .filter(s -> s.getSaleDate() != null
                        && !s.getSaleDate().isBefore(startOfDay)
                        && !s.getSaleDate().isAfter(endOfDay))
                .collect(Collectors.toList());

        double todayRevenue = todaySales.stream()
                .mapToDouble(DashboardController::applyAsDouble)
                .sum();

        long lowStockCount = stockRepository.findAll().stream()
                .filter(s -> s.getLowStockThreshold() != null
                        && s.getQuantity() != null
                        && s.getQuantity() < s.getLowStockThreshold())
                .count();
        long expiredCount = productService.getExpiredProducts().size();
        List<Product> expiringSoon = productService.getExpiringProducts(30);


        summary.put("todayRevenue", todayRevenue);
        summary.put("transactionCount", todaySales.size());
        summary.put("lowStockCount", lowStockCount);
        summary.put("expiredProducts", expiredCount);
        summary.put("expiringSoonCount", expiringSoon.size());
        summary.put("totalProducts", productService.getAll().size());
        summary.put("totalCustomers", customerRepository.count());
        summary.put("totalSuppliers", supplierRepository.count());
        summary.put("totalExpenses", expenseService.getAll().stream()
                .mapToDouble(Expense::getAmount).sum());

        return summary;
    }

    @GetMapping("/revenue/weekly")
    public List<Map<String, Object>> getWeeklyRevenue() {
        LocalDate today = LocalDate.now();
        LocalDate weekAgo = today.minusDays(7);
        return saleService.getDailyRevenue(
                weekAgo.atStartOfDay(),
                today.atTime(LocalTime.MAX)
        );
    }

    @GetMapping("/revenue/monthly")
    public List<Map<String, Object>> getMonthlyRevenue() {
        LocalDate today = LocalDate.now();
        LocalDate yearAgo = today.minusYears(1);
        return saleService.getMonthlyRevenue(
                yearAgo.atStartOfDay(),
                today.atTime(LocalTime.MAX)
        );
    }

    @GetMapping("/top-products")
    public List<Map<String, Object>> getTopProducts() {
        List<Object[]> results = saleItemRepository.findTopSellingProducts(TenantContext.getShopId());
        List<Map<String, Object>> topProducts = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("name", row[0] != null ? row[0].toString() : "Unknown");
            entry.put("quantity", row[1] != null ? ((Number) row[1]).intValue() : 0);
            entry.put("revenue", row[2] != null ? ((Number) row[2]).doubleValue() : 0.0);
            topProducts.add(entry);
        }
        return topProducts;
    }

    @GetMapping("/recent-sales")
    public List<Sale> getRecentSales() {
        return saleService.getRecentSales();
    }

    @GetMapping("/expenses")
    public List<Map<String, Object>> getExpenses() {
        LocalDate today = LocalDate.now();
        LocalDate yearAgo = today.minusYears(1);
        return expenseService.getAll().stream()
                .filter(e -> e.getExpenseDate() != null
                        && !e.getExpenseDate().isBefore(yearAgo))
                .map(e -> {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("id", e.getId());
                    entry.put("title", e.getTitle());
                    entry.put("amount", e.getAmount());
                    entry.put("description", e.getDescription());
                    entry.put("date", e.getExpenseDate().toString());
                    return entry;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/expiring-products")
    public List<Map<String, Object>> getExpiringProducts() {
        List<Product> expiring = productService.getExpiringProducts(30);
        return getMaps(expiring);
    }

    @GetMapping("/expired-products")
    public List<Map<String, Object>> getExpiredProducts() {
        List<Product> expired = productService.getExpiredProducts();
        return getMaps(expired);
    }

    @GetMapping("/profit")
    public Map<String, Object> getProfit() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        LocalDateTime startOfWeek = today.minusDays(6).atStartOfDay();
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfSixMonths = today.minusMonths(6).atStartOfDay();
        LocalDateTime startOfYear = today.withDayOfYear(1).atStartOfDay();

        Long shopId = TenantContext.getShopId();
        Double todayProfit = saleItemRepository.findProfitBetween(shopId, startOfDay, endOfDay);
        Double weekProfit = saleItemRepository.findProfitBetween(shopId, startOfWeek, endOfDay);
        Double monthProfit = saleItemRepository.findProfitBetween(shopId, startOfMonth, endOfDay);
        Double sixMonthProfit = saleItemRepository.findProfitBetween(shopId, startOfSixMonths, endOfDay);
        Double yearProfit = saleItemRepository.findProfitBetween(shopId, startOfYear, endOfDay);

        Map<String, Object> profit = new HashMap<>();
        profit.put("today", todayProfit != null ? todayProfit : 0.0);
        profit.put("week", weekProfit != null ? weekProfit : 0.0);
        profit.put("month", monthProfit != null ? monthProfit : 0.0);
        profit.put("sixMonths", sixMonthProfit != null ? sixMonthProfit : 0.0);
        profit.put("year", yearProfit != null ? yearProfit : 0.0);
        return profit;
    }

    @GetMapping("/profit/by-product")
    public List<Map<String, Object>> getProfitByProduct() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfYear = today.withDayOfYear(1).atStartOfDay();

        List<Object[]> results = saleItemRepository.findProfitByProduct(TenantContext.getShopId(), startOfDay, endOfDay, startOfMonth, startOfYear);
        List<Map<String, Object>> list = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("name", row[0] != null ? row[0].toString() : "Unknown");
            entry.put("dayProfit", row[1] != null ? ((Number) row[1]).doubleValue() : 0.0);
            entry.put("monthProfit", row[2] != null ? ((Number) row[2]).doubleValue() : 0.0);
            entry.put("yearProfit", row[3] != null ? ((Number) row[3]).doubleValue() : 0.0);
            entry.put("yearDebtProfit", row[4] != null ? ((Number) row[4]).doubleValue() : 0.0);
            list.add(entry);
        }
        return list;
    }

    private List<Map<String, Object>> getMaps(List<Product> expired) {
        return expired.stream().map(p -> {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", p.getId());
            entry.put("name", p.getName());
            int qty = stockRepository.findByProductId(p.getId())
                    .map(Stock::getQuantity).orElse(0);
            entry.put("quantity", qty);
            entry.put("expiryDate", p.getExpiryDate() != null ? p.getExpiryDate().toString() : null);
            return entry;
        }).collect(Collectors.toList());
    }
}

