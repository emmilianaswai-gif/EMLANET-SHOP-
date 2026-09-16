package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    List<User> findByRole(com.example.EMLANET_SHOP.Entity.Role role);
    List<User> findByShopId(Long shopId);
    long countByRole(com.example.EMLANET_SHOP.Entity.Role role);
}
