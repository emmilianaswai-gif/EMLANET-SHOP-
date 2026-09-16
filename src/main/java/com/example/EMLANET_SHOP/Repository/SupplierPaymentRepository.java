package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.SupplierPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierPaymentRepository extends JpaRepository<SupplierPayment, Long> {

    List<SupplierPayment> findBySupplierId(Long supplierId);

    @Modifying
    @Query("delete from SupplierPayment p where p.supplier.id = :supplierId")
    void deleteBySupplierId(@Param("supplierId") Long supplierId);
}
