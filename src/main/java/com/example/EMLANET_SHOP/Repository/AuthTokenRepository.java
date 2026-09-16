package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.AuthToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuthTokenRepository extends JpaRepository<AuthToken, Long> {
    Optional<AuthToken> findByToken(String token);
    void deleteByToken(String token);
}
