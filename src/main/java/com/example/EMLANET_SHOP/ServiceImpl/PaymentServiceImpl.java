package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Payment;
import com.example.EMLANET_SHOP.Repository.PaymentRepository;
import com.example.EMLANET_SHOP.Service.PaymentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;

    public PaymentServiceImpl(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Override
    @Transactional
    public Payment savePayment(Payment payment) {
        return paymentRepository.save(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Payment> getAll() {
        List<Payment> payments = paymentRepository.findAll();
        payments.forEach(p -> {
            if (p.getSale() != null && p.getSale().getSaleItems() != null) {
                p.getSale().getSaleItems().size();
            }
        });
        return payments;
    }

    @Override
    @Transactional(readOnly = true)
    public Payment getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Payment not found with id: " + id));
        if (payment.getSale() != null && payment.getSale().getSaleItems() != null) {
            payment.getSale().getSaleItems().size();
        }
        return payment;
    }

    @Override
    @Transactional
    public void deletePaymentById(Long id) {
        if (!paymentRepository.existsById(id)) {
            throw new RuntimeException("Payment not found with id: " + id);
        }

        paymentRepository.deleteById(id);
    }
}