package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByExpiryDateBetween(LocalDate start, LocalDate end);

    List<Product> findTop10ByOrderByExpiryDateAsc();

    @Query("SELECT p FROM Product p WHERE p.expiryDate IS NOT NULL AND p.expiryDate <= :date")
    List<Product> findExpiredProducts(@Param("date") LocalDate date);
}