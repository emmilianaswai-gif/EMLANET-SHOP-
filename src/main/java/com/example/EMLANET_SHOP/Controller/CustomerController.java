package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Customer;
import com.example.EMLANET_SHOP.Service.CustomerService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService service;

    public CustomerController(CustomerService service) {
        this.service = service;
    }

    @GetMapping
    public List<Customer> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Customer getById(@PathVariable Long id) {
        return service.getCustomerById(id);
    }

    @PostMapping
    public Customer create(@RequestBody Customer customer) {
        return service.save(customer);
    }

    @PutMapping("/{id}")
    public Customer update(@PathVariable Long id, @RequestBody Customer customer) {
        return service.updateCustomer(id, customer);
    }

    @PutMapping("/{id}/payment")
    public Customer addPayment(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        double payment = Double.parseDouble(payload.get("payment").toString());
        return service.addPayment(id, payment);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.deleteCustomerById(id);
    }
}
