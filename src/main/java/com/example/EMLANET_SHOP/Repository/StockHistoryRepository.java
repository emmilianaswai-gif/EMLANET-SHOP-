package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.StockHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockHistoryRepository extends JpaRepository<StockHistory, Long> {
    @EntityGraph(attributePaths = {"product"})
    List<StockHistory> findByProductIdOrderByCreatedAtDesc(Long productId);

    @EntityGraph(attributePaths = {"product"})
    List<StockHistory> findAll();

    @EntityGraph(attributePaths = {"product"})
    Optional<StockHistory> findById(Long id);

    @Transactional
    @Modifying
    void deleteByProductId(Long productId);
}
