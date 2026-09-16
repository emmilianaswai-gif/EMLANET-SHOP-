package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Sale;
import com.example.EMLANET_SHOP.Exception.ResourceNotFoundException;
import com.example.EMLANET_SHOP.Repository.CustomerRepository;
import com.example.EMLANET_SHOP.Entity.Customer;
import com.example.EMLANET_SHOP.Service.SaleService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/sales")
public class SaleController {

    private final SaleService saleService;
    private final CustomerRepository customerRepository;

    public SaleController(SaleService saleService, CustomerRepository customerRepository) {
        this.saleService = saleService;
        this.customerRepository = customerRepository;
    }

    @PostMapping
    public Sale create(@RequestBody Sale sale) {
        if (sale.getCustomer() != null && sale.getCustomer().getId() != null) {
            Customer customer = customerRepository.findById(sale.getCustomer().getId()).orElse(null);
            if (customer == null) {
                customer = new Customer();
                customer.setName("Walk-in Customer");
                customer.setType("walk-in");
                customer.setPaymentMethod("cash");
                customer.setAmount(0.0);
                customer.setPaid(0.0);
                customer = customerRepository.save(customer);
            }
            sale.setCustomer(customer);
        }
        return saleService.save(sale);
    }

    @GetMapping
    public List<Sale> getAll() {
        return saleService.getAll();
    }

    @GetMapping("/{id}")
    public Sale getById(@PathVariable Long id) {
        return saleService.getSaleById(id);
    }

    @PutMapping("/{id}")
    public Sale update(@PathVariable Long id, @RequestBody Sale sale) {
        Sale existing = saleService.getSaleById(id);
        if (sale.getDescription() != null) existing.setDescription(sale.getDescription());
        if (sale.getImage() != null) existing.setImage(sale.getImage());
        if (sale.getStatus() != null) existing.setStatus(sale.getStatus());
        if (sale.getPaymentStatus() != null) existing.setPaymentStatus(sale.getPaymentStatus());
        if (sale.getGrandTotal() != null) existing.setGrandTotal(sale.getGrandTotal());
        if (sale.getPaidAmount() != null) existing.setPaidAmount(sale.getPaidAmount());
        if (sale.getCustomer() != null) existing.setCustomer(sale.getCustomer());
        return saleService.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        saleService.deleteSaleById(id);
    }

    @GetMapping("/customer/{userId}")
    public Map<String, Object> getCustomerSales(@PathVariable Long userId) {
        Optional<Customer> custOpt = customerRepository.findByUserId(userId);
        Map<String, Object> result = new HashMap<>();
        if (custOpt.isEmpty()) {
            result.put("customer", null);
            result.put("sales", List.of());
            result.put("totalDebt", 0.0);
            result.put("totalPaid", 0.0);
            return result;
        }
        Customer customer = custOpt.get();
        List<Sale> allSales = saleService.getAll().stream()
                .filter(s -> s.getCustomer() != null && s.getCustomer().getId().equals(customer.getId()))
                .toList();
        double totalDebt = allSales.stream()
                .filter(s -> "UNPAID".equalsIgnoreCase(s.getPaymentStatus()))
                .mapToDouble(s -> s.getGrandTotal() != null ? s.getGrandTotal() : 0.0)
                .sum();
        double totalPaid = allSales.stream()
                .filter(s -> "PAID".equalsIgnoreCase(s.getPaymentStatus()))
                .mapToDouble(s -> s.getGrandTotal() != null ? s.getGrandTotal() : 0.0)
                .sum();
        result.put("customer", customer);
        result.put("sales", allSales);
        result.put("totalDebt", totalDebt);
        result.put("totalPaid", totalPaid);
        return result;
    }

    @PostMapping("/place-order")
    public Sale placeOrder(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");
        String paymentMethod = (String) body.getOrDefault("paymentMethod", "cash");

        Customer customer = customerRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Customer newCust = new Customer();
                    newCust.setName((String) body.getOrDefault("customerName", "Customer"));
                    newCust.setUserId(userId);
                    newCust.setType("regular");
                    newCust.setPaymentMethod(paymentMethod);
                    newCust.setAmount(0.0);
                    newCust.setPaid(0.0);
                    return customerRepository.save(newCust);
                });

        Sale sale = new Sale();
        sale.setCustomer(customer);
        sale.setPaymentMethod(paymentMethod);
        sale.setPaymentStatus("debt".equals(paymentMethod) ? "UNPAID" : "PAID");
        sale.setStatus("COMPLETED");
        sale.setDescription("Customer order");

        List<Sale> saved = List.of(saleService.save(sale));
        return saved.get(0);
    }
}
