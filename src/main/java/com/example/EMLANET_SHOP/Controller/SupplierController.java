package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Supplier;
import com.example.EMLANET_SHOP.Service.SupplierService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @PostMapping
    public Supplier save(@RequestBody Supplier supplier) {
        return supplierService.save(supplier);
    }

    @GetMapping
    public List<Supplier> getAll() {
        return supplierService.getAll();
    }

    @GetMapping("/{id}")
    public Supplier getById(@PathVariable Long id) {
        return supplierService.getSupplierById(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        supplierService.deleteSupplierById(id);
    }

    @PutMapping("/{id}")
    public Supplier update(@PathVariable Long id, @RequestBody Supplier supplier) {
        return supplierService.updateSupplier(id, supplier);
    }
}
