package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.PurchasesItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PurchasesItemRepository extends JpaRepository<PurchasesItem, Long> {
    @Transactional
    @Modifying
    void deleteByProductId(Long productId);
}
