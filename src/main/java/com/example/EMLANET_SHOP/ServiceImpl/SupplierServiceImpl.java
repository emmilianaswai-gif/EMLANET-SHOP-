package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Supplier;
import com.example.EMLANET_SHOP.Exception.ResourceNotFoundException;
import com.example.EMLANET_SHOP.Repository.SupplierRepository;
import com.example.EMLANET_SHOP.Service.SupplierService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierServiceImpl(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @Override
    @Transactional
    public Supplier save(Supplier supplier) {
        return supplierRepository.save(supplier);
    }

    @Override
    @Transactional(readOnly = true)
    public Supplier getSupplierById(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Supplier> getAll() {
        return supplierRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteSupplierById(Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new ResourceNotFoundException("Supplier not found");
        }
        supplierRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Supplier updateSupplier(Long id, Supplier updated) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));
        if (updated.getName() != null) existing.setName(updated.getName());
        if (updated.getPhone() != null) existing.setPhone(updated.getPhone());
        if (updated.getEmail() != null) existing.setEmail(updated.getEmail());
        if (updated.getAddress() != null) existing.setAddress(updated.getAddress());
        if (updated.getCompany() != null) existing.setCompany(updated.getCompany());
        return supplierRepository.save(existing);
    }
}
