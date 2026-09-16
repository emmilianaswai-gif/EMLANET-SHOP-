package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "stocks")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class Stock implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id")
    private Long shopId;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Product product;

    @Column(name = "quantity", nullable = false)
    @Builder.Default
    private Integer quantity = 0;

    @Column(name = "low_stock_threshold")
    @Builder.Default
    private Integer lowStockThreshold = 10;

    @Column(name = "change_type", nullable = false)
    @Builder.Default
    private String changeType = "Added";

    @Column(name = "date", nullable = false)
    @Builder.Default
    private String date = "";

    @Column(name = "product_name", nullable = false)
    @Builder.Default
    private String productName = "";

    @Column(name = "name")
    private String name;

    @Column(name = "category")
    private String category;

    @Column(name = "description")
    private String description;

    @Column(name = "image", length = 500)
    private String image;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Category categoryId;

    @Column(name = "status", length = 50)
    private String status;

    @Column(name = "unit_price")
    private Double unitPrice;

    @Column(name = "expiry_date")
    private String expiryDate;

    @PrePersist
    protected void onCreate() {
        if (changeType == null) changeType = "Added";
        if (date == null || date.isBlank()) date = java.time.LocalDate.now().toString();
        if (productName == null || productName.isBlank()) {
            productName = (product != null && product.getName() != null) ? product.getName() : "";
        }
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
