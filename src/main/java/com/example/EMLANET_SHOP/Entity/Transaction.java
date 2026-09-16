package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class Transaction implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(nullable = false)
    private Double amount;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String reference;

    @Column(name = "shop_id")
    private Long shopId;

    @ManyToOne
    @JoinColumn(name = "sale_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Sale sale;

    @ManyToOne
    @JoinColumn(name = "payment_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Payment payment;

    @ManyToOne
    @JoinColumn(name = "expense_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Expense expense;

    private LocalDateTime transactionDate;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.transactionDate == null) {
            this.transactionDate = LocalDateTime.now();
        }
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
