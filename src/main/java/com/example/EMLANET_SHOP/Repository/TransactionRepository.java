package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByType(String type);

    List<Transaction> findByTransactionDateBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT t.type, SUM(t.amount) FROM Transaction t WHERE t.transactionDate BETWEEN :start AND :end GROUP BY t.type")
    List<Object[]> getTransactionSummaryByType(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<Transaction> findBySaleId(Long saleId);

    List<Transaction> findByPaymentId(Long paymentId);
}
