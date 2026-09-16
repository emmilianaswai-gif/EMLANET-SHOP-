package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.CustomRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomRoleRepository extends JpaRepository<CustomRole, Long> {
    boolean existsByNameIgnoreCase(String name);
}
