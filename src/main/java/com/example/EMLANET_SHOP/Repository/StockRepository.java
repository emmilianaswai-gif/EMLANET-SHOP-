package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Stock;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {
    @EntityGraph(attributePaths = {"product"})
    Optional<Stock> findByProductId(Long productId);

    @EntityGraph(attributePaths = {"product"})
    List<Stock> findAll();

    @EntityGraph(attributePaths = {"product"})
    Optional<Stock> findById(Long id);
}
