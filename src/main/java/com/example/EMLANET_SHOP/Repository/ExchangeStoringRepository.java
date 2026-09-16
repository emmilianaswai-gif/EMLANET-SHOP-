package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.ExchangeStoring;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ExchangeStoringRepository extends JpaRepository<ExchangeStoring, Long> {
    List<ExchangeStoring> findByStatus(String status);
    List<ExchangeStoring> findByType(String type);
    List<ExchangeStoring> findBySaleId(Long saleId);
    List<ExchangeStoring> findByProductIdAndType(Long productId, String type);
    @Transactional
    @Modifying
    void deleteByProductId(Long productId);
}
