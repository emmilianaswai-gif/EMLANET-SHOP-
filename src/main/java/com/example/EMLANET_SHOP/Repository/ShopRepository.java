package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {
}
