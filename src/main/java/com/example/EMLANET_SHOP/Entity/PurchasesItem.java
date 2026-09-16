package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "purchases_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class PurchasesItem implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double costPrice;

    @Column(nullable = false)
    @Builder.Default
    private Double subtotal = 0.0;

    @Column(length = 500)
    private String notes;

    @Column(name = "shop_id")
    private Long shopId;

    @ManyToOne
    @JoinColumn(name = "purchase_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Purchase purchase;

    @ManyToOne
    @JoinColumn(name = "product_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Product product;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    @PreUpdate
    protected void calculateSubtotal() {
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
        if (this.quantity != null && this.costPrice != null) {
            this.subtotal = this.quantity * this.costPrice;
        }
    }
}
