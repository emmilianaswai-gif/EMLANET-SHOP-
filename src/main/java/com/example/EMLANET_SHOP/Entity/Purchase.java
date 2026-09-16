package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "purchases")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class Purchase implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String productName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double unitPrice;

    @Column(nullable = false)
    @Builder.Default
    private Double totalAmount = 0.0;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String paymentStatus = "UNPAID";

    @Column(name = "shop_id")
    private Long shopId;

    private LocalDateTime purchaseDate;

    @Column(length = 200)
    private String customerName;

    @Column(length = 50)
    private String customerContact;

    @ManyToOne
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Supplier supplier;

    @PrePersist
    protected void onCreate() {
        if (this.purchaseDate == null) {
            this.purchaseDate = LocalDateTime.now();
        }
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "PENDING";
        }
        if (this.paymentStatus == null || this.paymentStatus.isBlank()) {
            this.paymentStatus = "UNPAID";
        }
        if (this.quantity != null && this.unitPrice != null) {
            this.totalAmount = this.quantity * this.unitPrice;
        }
        if (this.totalAmount == null) {
            this.totalAmount = 0.0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        if (this.quantity != null && this.unitPrice != null) {
            this.totalAmount = this.quantity * this.unitPrice;
        }
    }
}
