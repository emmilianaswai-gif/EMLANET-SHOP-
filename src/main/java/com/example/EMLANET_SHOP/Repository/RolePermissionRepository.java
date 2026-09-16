package com.example.EMLANET_SHOP.Repository;

import com.example.EMLANET_SHOP.Entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {
    List<RolePermission> findByRoleName(String roleName);

    @Modifying
    void deleteByRoleName(String roleName);

    @Modifying
    void deleteByRoleNameAndModuleId(String roleName, String moduleId);
}
