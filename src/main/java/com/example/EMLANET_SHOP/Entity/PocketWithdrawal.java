package com.example.EMLANET_SHOP.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "pocket_withdrawals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class PocketWithdrawal implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String platformId;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(length = 100)
    @Builder.Default
    private String platformName = "";

    @Column(nullable = false, length = 100)
    private String accountNumber;

    @Column(length = 100)
    @Builder.Default
    private String accountName = "";

    @Column(nullable = false)
    private Double amount;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 50)
    @Builder.Default
    private String withdrawnBy = "Staff";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "Completed";

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.status == null || this.status.isBlank()) this.status = "Completed";
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
