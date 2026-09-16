package com.example.EMLANET_SHOP.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FilterDef(name = "shopFilter", parameters = @ParamDef(name = "shopId", type = Long.class), defaultCondition = "shop_id = :shopId")
@Filter(name = "shopFilter")
public class User implements TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(length = 150, unique = true)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(nullable = false)
    private String password;

    @Column(length = 100)
    private String plainPassword;

    @Column(name = "shop_id")
    private Long shopId;

    @Transient
    private String shopName;

    @Transient
    private String shopAddress;

    @Transient
    private String shopPhone;

    @Transient
    private String shopLocation;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isEnabled = true;

    @Column(length = 20)
    @Builder.Default
    private String status = "active";

    @Column(length = 500)
    private String avatar;

    private String hireDate;

    @Column(length = 20)
    private String contractType;

    @Column(length = 100)
    private String department;

    private Double salary;

    @Column(length = 100)
    private String emergencyContact;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 500)
    private String permissions;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime lastLogin;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.isEnabled == null) {
            this.isEnabled = true;
        }
        if (this.shopId == null) {
            this.shopId = com.example.EMLANET_SHOP.Config.TenantContext.getShopId();
        }
    }
}
