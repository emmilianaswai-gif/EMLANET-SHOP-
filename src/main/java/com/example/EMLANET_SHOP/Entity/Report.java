package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class Report implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 30)
    private String type;

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(updatable = false)
    private LocalDateTime generatedDate;

    @Column(columnDefinition = "TEXT")
    private String data;

    @ManyToOne
    @JoinColumn(name = "created_by")
    @JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private User createdBy;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";

    @PrePersist
    protected void onCreate() {
        this.generatedDate = LocalDateTime.now();
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
