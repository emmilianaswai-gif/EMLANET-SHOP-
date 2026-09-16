package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.ExchangeStoring;
import com.example.EMLANET_SHOP.Service.ExchangeStoringService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exchange-storing")
public class ExchangeStoringController {

    private final ExchangeStoringService service;

    public ExchangeStoringController(ExchangeStoringService service) {
        this.service = service;
    }

    @PostMapping
    public ExchangeStoring create(@RequestBody ExchangeStoring exchange) {
        return service.save(exchange);
    }

    @GetMapping
    public List<ExchangeStoring> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type) {
        if (status != null && !status.isEmpty()) {
            return service.getByStatus(status);
        }
        if (type != null && !type.isEmpty()) {
            return service.getByType(type);
        }
        return service.getAll();
    }

    @GetMapping("/{id}")
    public ExchangeStoring getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PutMapping("/{id}")
    public ExchangeStoring update(@PathVariable Long id, @RequestBody ExchangeStoring exchange) {
        return service.save(exchange);
    }

    @PutMapping("/{id}/status")
    public ExchangeStoring updateStatus(@PathVariable Long id, @RequestBody String status) {
        return service.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
