package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "exchange_storing")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class ExchangeStoring implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id")
    private Long shopId;

    @ManyToOne
    @JoinColumn(name = "sale_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Sale sale;

    @ManyToOne
    @JoinColumn(name = "product_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Product product;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(nullable = false)
    private Integer quantity;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(length = 100)
    private String date;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "Pending";

    @Column(length = 200)
    private String productName;

    @PrePersist
    protected void onCreate() {
        if (this.date == null || this.date.isBlank()) {
            this.date = LocalDateTime.now().toString();
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "Pending";
        }
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
