package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.SupplierPayment;

import java.util.List;

public interface SupplierPaymentService {

    SupplierPayment save(SupplierPayment payment);

    SupplierPayment getById(Long id);

    List<SupplierPayment> getAll();

    void deleteById(Long id);

    void deleteBySupplierId(Long supplierId);
}
