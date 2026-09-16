package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    void deleteBySaleId(Long saleId);
}
