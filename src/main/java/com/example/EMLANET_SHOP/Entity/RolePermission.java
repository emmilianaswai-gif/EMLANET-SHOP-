package com.example.EMLANET_SHOP.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "role_permissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"role_name", "module_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "role_name", nullable = false, length = 30)
    private String roleName;

    @Column(name = "module_id", nullable = false, length = 50)
    private String moduleId;

    @Column(name = "can_read", nullable = false)
    @Builder.Default
    private Boolean canRead = false;

    @Column(name = "can_write", nullable = false)
    @Builder.Default
    private Boolean canWrite = false;

    @Column(name = "can_edit", nullable = false)
    @Builder.Default
    private Boolean canEdit = false;

    @Column(name = "can_delete", nullable = false)
    @Builder.Default
    private Boolean canDelete = false;

    @Column(name = "can_export", nullable = false)
    @Builder.Default
    private Boolean canExport = false;
}
