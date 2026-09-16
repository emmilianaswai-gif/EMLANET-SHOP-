package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "sale_items")
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class SaleItem implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id")
    private Long shopId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Product product;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sale_id")
    @JsonIgnoreProperties({"sale", "saleItems", "hibernateLazyInitializer", "handler"})
    private Sale sale;

    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(nullable = false)
    private Double price = 0.0;

    private Double costPrice = 0.0;

    @Column(nullable = false)
    private Double total = 0.0;

    @JsonProperty("saleDate")
    public LocalDateTime getSaleDate() {
        return sale != null ? sale.getSaleDate() : null;
    }

    @PrePersist
    @PreUpdate
    public void calculateTotal() {
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
        if (this.quantity != null && this.price != null) {
            this.total = this.quantity * this.price;
        }
    }
}
