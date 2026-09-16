package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "products")
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class Product implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 50)
    private String sku;

    @Column(name = "price")
    private Double price;

    @Column(name = "buying-price")
    private Double buyingPrice;

    @Column(nullable = false)
    private Integer quantity = 0;

    @Column(length = 20)
    private String unit = "piece";

    @Column(name = "pieces-per-unit")
    private Integer piecesPerUnit;

    private LocalDate expiryDate;

    @Column
    @Builder.Default
    private Double discount = 0.0;

    @Column(length = 10)
    @Builder.Default
    private String discountType = "percent";

    @Column(name = "shop_id")
    private Long shopId;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }

    @ManyToOne
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties({"products", "hibernateLazyInitializer", "handler"})
    private Category category;

    @ManyToOne
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Supplier supplier;
}
