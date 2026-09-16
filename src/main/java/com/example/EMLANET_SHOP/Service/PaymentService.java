package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Payment;

import java.util.List;

public interface PaymentService {

    Payment savePayment(Payment payment);

    List<Payment> getAll();

    Payment getPaymentById(Long id);

    void deletePaymentById(Long id);
}
