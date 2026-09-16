package com.example.EMLANET_SHOP.Entity;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;


@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class Debt implements TenantAware {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(name = "shop_id")
    private Long shopId;


    private Double amount;


    private String description;


    @PrePersist
    protected void onCreate() {
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }


    @ManyToOne(fetch = FetchType.LAZY)

    @JoinColumn(name="customer_id")

    @JsonIgnoreProperties({"debts", "hibernateLazyInitializer", "handler"})
    private Customer customer;


}