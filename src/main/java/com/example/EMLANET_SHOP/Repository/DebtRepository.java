package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Debt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DebtRepository
        extends JpaRepository<Debt, Long> {

    List<Debt> findByCustomerId(Long customerId);

}