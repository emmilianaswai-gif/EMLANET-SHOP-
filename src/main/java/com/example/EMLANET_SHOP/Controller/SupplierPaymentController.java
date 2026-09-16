package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.SupplierPayment;
import com.example.EMLANET_SHOP.Service.SupplierPaymentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/supplier-payments")
public class SupplierPaymentController {

    private final SupplierPaymentService paymentService;

    public SupplierPaymentController(SupplierPaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    public List<SupplierPayment> getAll() {
        return paymentService.getAll();
    }

    @GetMapping("/{id}")
    public SupplierPayment getById(@PathVariable Long id) {
        return paymentService.getById(id);
    }

    @PostMapping
    public SupplierPayment save(@RequestBody SupplierPayment payment) {
        return paymentService.save(payment);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        paymentService.deleteById(id);
    }

    @DeleteMapping("/supplier/{supplierId}")
    public void deleteBySupplier(@PathVariable Long supplierId) {
        paymentService.deleteBySupplierId(supplierId);
    }
}
