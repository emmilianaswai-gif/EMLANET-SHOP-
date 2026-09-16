package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    // Use this when fetching a single category by ID
    @Query("SELECT c FROM Category c LEFT JOIN FETCH c.products WHERE c.id = :id")
    Optional<Category> findByIdWithProducts(@Param("id") Long id);

    // Use this if you are fetching ALL categories for a list view
    @Query("SELECT DISTINCT c FROM Category c LEFT JOIN FETCH c.products")
    List<Category> findAllWithProducts();
}
