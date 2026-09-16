package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.SaleItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    @Override
    @EntityGraph(attributePaths = {"product", "sale", "sale.customer"})
    List<SaleItem> findAll();

    @Query(value = "SELECT p.name, COALESCE(SUM(si.quantity), 0), COALESCE(SUM(si.price * si.quantity), 0) FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.shop_id = :shopId GROUP BY p.name ORDER BY SUM(si.quantity) DESC", nativeQuery = true)
    List<Object[]> findTopSellingProducts(@Param("shopId") Long shopId);

    @Query(value = "SELECT COALESCE(SUM((si.price - COALESCE(si.cost_price, 0)) * si.quantity), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE si.shop_id = :shopId AND s.sale_date BETWEEN :start AND :end", nativeQuery = true)
    Double findProfitBetween(@Param("shopId") Long shopId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "SELECT p.name, " +
            "COALESCE(SUM(CASE WHEN s.sale_date >= :startOfDay AND s.sale_date <= :endOfDay THEN (si.price - COALESCE(si.cost_price, 0)) * si.quantity ELSE 0 END), 0) as day_profit, " +
            "COALESCE(SUM(CASE WHEN s.sale_date >= :startOfMonth AND s.sale_date <= :endOfDay THEN (si.price - COALESCE(si.cost_price, 0)) * si.quantity ELSE 0 END), 0) as month_profit, " +
            "COALESCE(SUM(CASE WHEN s.sale_date >= :startOfYear AND s.sale_date <= :endOfDay THEN (si.price - COALESCE(si.cost_price, 0)) * si.quantity ELSE 0 END), 0) as year_profit, " +
            "COALESCE(SUM(CASE WHEN s.sale_date >= :startOfYear AND s.sale_date <= :endOfDay AND (s.payment_method = 'debt' OR s.payment_status = 'UNPAID' OR s.payment_status = 'unpaid') THEN (si.price - COALESCE(si.cost_price, 0)) * si.quantity ELSE 0 END), 0) as year_debt_profit " +
            "FROM sale_items si JOIN sales s ON si.sale_id = s.id JOIN products p ON si.product_id = p.id " +
            "WHERE si.shop_id = :shopId " +
            "GROUP BY p.id, p.name ORDER BY COALESCE(SUM(CASE WHEN s.sale_date >= :startOfYear AND s.sale_date <= :endOfDay THEN (si.price - COALESCE(si.cost_price, 0)) * si.quantity ELSE 0 END), 0) DESC",
            nativeQuery = true)
    List<Object[]> findProfitByProduct(
            @Param("shopId") Long shopId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay,
            @Param("startOfMonth") LocalDateTime startOfMonth,
            @Param("startOfYear") LocalDateTime startOfYear);

    @Transactional
    @Modifying
    void deleteByProductId(Long productId);
}
