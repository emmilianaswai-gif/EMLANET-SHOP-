package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
}
