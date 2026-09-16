package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Config.AuthContext;
import com.example.EMLANET_SHOP.Entity.Role;
import com.example.EMLANET_SHOP.Entity.User;
import com.example.EMLANET_SHOP.Service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<User> getAllUsers() {
        Long shopId = AuthContext.getShopId();
        String role = AuthContext.getRole();
        if ("super_admin".equalsIgnoreCase(role)) {
            return userService.getAllUsers();
        }
        if (shopId != null) {
            return userService.getUsersByShopId(shopId);
        }
        return List.of();
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @GetMapping("/role/{roleName}")
    public List<User> getUsersByRole(@PathVariable String roleName) {
        Role role;
        try {
            role = Role.fromString(roleName);
        } catch (IllegalArgumentException e) {
            return List.of();
        }
        Long shopId = AuthContext.getShopId();
        String authRole = AuthContext.getRole();
        if ("super_admin".equalsIgnoreCase(authRole)) {
            return userService.getUsersByRole(role);
        }
        if (shopId != null) {
            return userService.getUsersByShopId(shopId).stream()
                    .filter(u -> role.equals(u.getRole()))
                    .toList();
        }
        return List.of();
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        Long shopId = AuthContext.getShopId();
        String role = AuthContext.getRole();
        if (shopId != null && !"super_admin".equalsIgnoreCase(role)) {
            user.setShopId(shopId);
        }
        return userService.createUser(user);
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.updateUser(id, user);
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUserById(id);
    }

    @PutMapping("/{id}/role")
    public User changeRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String roleStr = body.get("role");
        if (roleStr == null || roleStr.isBlank()) {
            throw new RuntimeException("Role is required");
        }
        Role role;
        try {
            role = Role.fromString(roleStr);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role: " + roleStr);
        }
        return userService.changeRole(id, role);
    }

    @PutMapping("/{id}/permissions")
    public User updatePermissions(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String permissions = body.get("permissions");
        return userService.updatePermissions(id, permissions);
    }
}
