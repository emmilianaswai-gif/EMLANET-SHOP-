package com.example.EMLANET_SHOP.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class FeedbackMessage implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String conversationId;

    @Column(nullable = false, length = 150)
    private String senderName;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(length = 20)
    private String senderPhone;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false, length = 10)
    private String direction;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
