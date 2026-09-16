package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.PocketCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PocketCollectionRepository extends JpaRepository<PocketCollection, Long> {
}
