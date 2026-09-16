package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @Query(value = "SELECT EXTRACT(MONTH FROM e.expense_date) as month, EXTRACT(YEAR FROM e.expense_date) as year, COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.shop_id = :shopId AND e.expense_date BETWEEN :start AND :end GROUP BY EXTRACT(YEAR FROM e.expense_date), EXTRACT(MONTH FROM e.expense_date) ORDER BY EXTRACT(YEAR FROM e.expense_date), EXTRACT(MONTH FROM e.expense_date)", nativeQuery = true)
    List<Object[]> findMonthlyExpensesBetween(@Param("shopId") Long shopId, @Param("start") LocalDate start, @Param("end") LocalDate end);
}
