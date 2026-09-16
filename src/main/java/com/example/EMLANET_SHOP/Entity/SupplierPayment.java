package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "supplier_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class SupplierPayment implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id")
    private Long shopId;

    @ManyToOne
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Supplier supplier;

    private Double amount;

    @Column(length = 30)
    private String method;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 50)
    private String date;

    @PrePersist
    protected void onCreate() {
        if (this.date == null || this.date.isBlank()) {
            this.date = LocalDateTime.now().toString();
        }
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
