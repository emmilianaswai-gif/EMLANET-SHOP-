package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.SupplierPayment;
import com.example.EMLANET_SHOP.Exception.ResourceNotFoundException;
import com.example.EMLANET_SHOP.Repository.SupplierPaymentRepository;
import com.example.EMLANET_SHOP.Service.SupplierPaymentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SupplierPaymentServiceImpl implements SupplierPaymentService {

    private final SupplierPaymentRepository paymentRepository;

    public SupplierPaymentServiceImpl(SupplierPaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Override
    @Transactional
    public SupplierPayment save(SupplierPayment payment) {
        return paymentRepository.save(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierPayment getById(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier payment not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupplierPayment> getAll() {
        return paymentRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        if (!paymentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Supplier payment not found with id: " + id);
        }
        paymentRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void deleteBySupplierId(Long supplierId) {
        paymentRepository.deleteBySupplierId(supplierId);
    }
}
