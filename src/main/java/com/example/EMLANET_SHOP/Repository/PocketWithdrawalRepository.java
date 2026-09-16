package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.PocketWithdrawal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PocketWithdrawalRepository extends JpaRepository<PocketWithdrawal, Long> {
}
