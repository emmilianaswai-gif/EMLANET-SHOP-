package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.Sale;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    @EntityGraph(attributePaths = {"saleItems", "saleItems.product", "customer"})
    List<Sale> findAll();

    @EntityGraph(attributePaths = {"saleItems", "saleItems.product", "customer"})
    Optional<Sale> findById(Long id);

    @EntityGraph(attributePaths = {"saleItems", "saleItems.product", "customer"})
    List<Sale> findTop10ByOrderBySaleDateDesc();

    default List<Sale> findAllWithItems() {
        return findAll();
    }

    default Optional<Sale> findByIdWithItems(Long id) {
        return findById(id);
    }

    default List<Sale> findTop10WithItems() {
        return findTop10ByOrderBySaleDateDesc();
    }

    List<Sale> findBySaleDateBetween(LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = {"saleItems", "saleItems.product", "customer"})
    List<Sale> findByCustomerIdOrderBySaleDateDesc(Long customerId);

    @EntityGraph(attributePaths = {"saleItems", "saleItems.product", "customer"})
    List<Sale> findByCustomerIdAndPaymentStatusOrderBySaleDateDesc(Long customerId, String paymentStatus);

    @Query(value = "SELECT CAST(s.sale_date AS DATE) as day, COALESCE(SUM(s.grand_total), 0) FROM sales s WHERE s.shop_id = :shopId AND s.sale_date BETWEEN :start AND :end GROUP BY CAST(s.sale_date AS DATE) ORDER BY CAST(s.sale_date AS DATE)", nativeQuery = true)
    List<Object[]> findDailyRevenueBetween(@Param("shopId") Long shopId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "SELECT EXTRACT(MONTH FROM s.sale_date) as month, EXTRACT(YEAR FROM s.sale_date) as year, COALESCE(SUM(s.grand_total), 0) FROM sales s WHERE s.shop_id = :shopId AND s.sale_date BETWEEN :start AND :end GROUP BY EXTRACT(YEAR FROM s.sale_date), EXTRACT(MONTH FROM s.sale_date) ORDER BY EXTRACT(YEAR FROM s.sale_date), EXTRACT(MONTH FROM s.sale_date)", nativeQuery = true)
    List<Object[]> findMonthlyRevenueBetween(@Param("shopId") Long shopId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
