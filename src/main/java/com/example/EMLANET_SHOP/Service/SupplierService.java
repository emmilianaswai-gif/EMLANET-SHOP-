package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Supplier;

import java.util.List;

public interface SupplierService {

    Supplier save(Supplier supplier);

    Supplier getSupplierById(Long id);

    List<Supplier> getAll();

    void deleteSupplierById(Long id);

    Supplier updateSupplier(Long id, Supplier supplier);
}
