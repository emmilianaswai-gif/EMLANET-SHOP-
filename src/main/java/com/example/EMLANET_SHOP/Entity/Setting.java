package com.example.EMLANET_SHOP.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class Setting implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(length = 100)
    private String storeName;

    @Column(length = 10)
    private String currency;

    @Column(length = 10)
    private String openingTime;

    @Column(length = 10)
    private String closingTime;

    private Double taxRate;

    private Integer lowStockThreshold;

    @Builder.Default
    private Boolean autoInvoicing = true;

    @Column(length = 20)
    @Builder.Default
    private String defaultUnit = "piece";

    @Builder.Default
    private Boolean showExpiryAlerts = true;

    @PrePersist
    protected void onCreate() {
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
