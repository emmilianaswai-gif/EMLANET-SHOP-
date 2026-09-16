package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Payment;
import com.example.EMLANET_SHOP.Service.PaymentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public Payment create(@RequestBody Payment payment) {
        return paymentService.savePayment(payment);
    }

    @GetMapping
    public List<Payment> getAll() {
        return paymentService.getAll();
    }

    @GetMapping("/{id}")
    public Payment getById(@PathVariable Long id) {
        return paymentService.getPaymentById(id);
    }

    @PutMapping("/{id}")
    public Payment update(@PathVariable Long id, @RequestBody Payment payment) {
        Payment existing = paymentService.getPaymentById(id);
        if (payment.getAmount() != null) existing.setAmount(payment.getAmount());
        if (payment.getPaymentMethod() != null) existing.setPaymentMethod(payment.getPaymentMethod());
        if (payment.getStatus() != null) existing.setStatus(payment.getStatus());
        if (payment.getReferenceNumber() != null) existing.setReferenceNumber(payment.getReferenceNumber());
        if (payment.getNotes() != null) existing.setNotes(payment.getNotes());
        if (payment.getReceiptImage() != null) existing.setReceiptImage(payment.getReceiptImage());
        if (payment.getSale() != null) existing.setSale(payment.getSale());
        return paymentService.savePayment(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        paymentService.deletePaymentById(id);
    }
}
