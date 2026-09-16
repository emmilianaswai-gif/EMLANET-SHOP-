package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "sales")
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class Sale implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime saleDate;

    private Double grandTotal = 0.0;

    private Double paidAmount = 0.0;

    private Integer quantity;

    private Double price;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(length = 30)
    private String paymentMethod;

    @Column(length = 30)
    private String customerType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String image;

    @Column(nullable = false, length = 20)
    private String status = "COMPLETED";

    @Column(nullable = false, length = 20)
    private String paymentStatus = "UNPAID";

    @ManyToOne
    @JoinColumn(name = "customer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Customer customer;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<SaleItem> saleItems;

    @PrePersist
    @PreUpdate
    public void prepareSaleData() {
        if (this.saleDate == null) {
            this.saleDate = LocalDateTime.now();
        }
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "COMPLETED";
        }
        if (this.paymentStatus == null || this.paymentStatus.isBlank()) {
            this.paymentStatus = "UNPAID";
        }
        if (this.grandTotal == null) {
            this.grandTotal = 0.0;
        }

        if (saleItems != null && !saleItems.isEmpty()) {
            this.grandTotal = saleItems.stream()
                    .mapToDouble(item -> {
                        item.calculateTotal();
                        return item.getTotal();
                    })
                    .sum();
        }
    }
}
