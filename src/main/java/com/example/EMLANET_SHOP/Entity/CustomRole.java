package com.example.EMLANET_SHOP.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "custom_roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String name;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String color = "#64748b";

    @Column(nullable = false)
    @Builder.Default
    private Integer level = 10;

    @Column(length = 200)
    @Builder.Default
    private String description = "";

    @Column(nullable = false)
    @Builder.Default
    private Boolean isSystem = false;
}
