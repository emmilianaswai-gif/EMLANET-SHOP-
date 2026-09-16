package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments", uniqueConstraints = @UniqueConstraint(name = "uk_payments_shop_reference", columnNames = {"shop_id", "reference_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class Payment implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 100)
    private String referenceNumber;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false, length = 30)
    private String paymentMethod;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    private LocalDateTime paymentDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 500)
    private String receiptImage;

    @ManyToOne
    @JoinColumn(name = "sale_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Sale sale;

    @PrePersist
    protected void onCreate() {
        if (this.paymentDate == null) {
            this.paymentDate = LocalDateTime.now();
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "PENDING";
        }
        if (this.paymentMethod == null || this.paymentMethod.isBlank()) {
            this.paymentMethod = "CASH";
        }
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
