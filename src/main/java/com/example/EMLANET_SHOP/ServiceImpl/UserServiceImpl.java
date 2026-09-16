package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Role;
import com.example.EMLANET_SHOP.Entity.Shop;
import com.example.EMLANET_SHOP.Entity.User;
import com.example.EMLANET_SHOP.Exception.ResourceNotFoundException;
import com.example.EMLANET_SHOP.Repository.ShopRepository;
import com.example.EMLANET_SHOP.Repository.UserRepository;
import com.example.EMLANET_SHOP.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public User createUser(User user) {
        System.out.println("=== CREATE USER: username=" + user.getUsername() + " role=" + user.getRole() + " ===");
        if (user.getUsername() != null && !user.getUsername().isBlank()
                && userRepository.findByUsername(user.getUsername().trim()).isPresent()) {
            throw new RuntimeException("Username '" + user.getUsername() + "' is already taken");
        }
        if (user.getShopId() != null) {
            boolean shopExists = shopRepository.existsById(user.getShopId());
            if (!shopExists) {
                throw new RuntimeException("Selected shop does not exist");
            }
        } else {
            String shopName = user.getShopName() != null && !user.getShopName().isBlank()
                    ? user.getShopName().trim()
                    : (user.getUsername() != null && !user.getUsername().isBlank() ? user.getUsername().trim() : "Shop") + "'s Shop";
            Shop shop = Shop.builder()
                    .name(shopName)
                    .address(user.getShopAddress())
                    .phone(user.getShopPhone())
                    .location(user.getShopLocation())
                    .build();
            shop = shopRepository.save(shop);
            user.setShopId(shop.getId());
            System.out.println("=== CREATE USER: Auto-created shop id=" + shop.getId() + " name=" + shop.getName() + " ===");
        }
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            user.setPlainPassword(user.getPassword());
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            System.out.println("=== CREATE USER: Password encoded, prefix=" + user.getPassword().substring(0, Math.min(7, user.getPassword().length())) + " ===");
        } else {
            System.out.println("=== CREATE USER: WARNING - No password provided! ===");
        }
        if (user.getEmail() != null && user.getEmail().isBlank()) {
            user.setEmail(null);
            System.out.println("=== CREATE USER: Empty email set to null ===");
        }
        User saved = userRepository.save(user);
        System.out.println("=== CREATE USER: Saved with id=" + saved.getId() + " ===");
        return saved;
    }

    @Override
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public List<User> getUsersByRole(Role role) {
        return userRepository.findByRole(role);
    }

    @Override
    public List<User> getUsersByShopId(Long shopId) {
        return userRepository.findByShopId(shopId);
    }

    @Override
    public void deleteUserById(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    @Override
    public User updateUser(Long id, User user) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (user.getUsername() != null) {
            String newUsername = user.getUsername().trim();
            userRepository.findByUsername(newUsername).ifPresent(existingUser -> {
                if (!existingUser.getId().equals(id)) {
                    throw new RuntimeException("Username '" + newUsername + "' is already taken");
                }
            });
            existing.setUsername(newUsername);
        }
        if (user.getFullName() != null) existing.setFullName(user.getFullName());
        if (user.getEmail() != null) {
            existing.setEmail(user.getEmail().isBlank() ? null : user.getEmail());
        }
        if (user.getPhone() != null) existing.setPhone(user.getPhone());
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            existing.setPlainPassword(user.getPassword());
            existing.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        if (user.getRole() != null) existing.setRole(user.getRole());
        if (user.getIsEnabled() != null) existing.setIsEnabled(user.getIsEnabled());
        if (user.getAvatar() != null) existing.setAvatar(user.getAvatar());
        if (user.getHireDate() != null) existing.setHireDate(user.getHireDate());
        if (user.getContractType() != null) existing.setContractType(user.getContractType());
        if (user.getDepartment() != null) existing.setDepartment(user.getDepartment());
        if (user.getSalary() != null) existing.setSalary(user.getSalary());
        if (user.getEmergencyContact() != null) existing.setEmergencyContact(user.getEmergencyContact());
        if (user.getAddress() != null) existing.setAddress(user.getAddress());
        if (user.getNotes() != null) existing.setNotes(user.getNotes());
        if (user.getStatus() != null) existing.setStatus(user.getStatus());
        if (user.getPermissions() != null) existing.setPermissions(user.getPermissions());
        return userRepository.save(existing);
    }

    @Override
    public User changeRole(Long id, Role role) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        existing.setRole(role);
        return userRepository.save(existing);
    }

    @Override
    public User updatePermissions(Long id, String permissions) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        existing.setPermissions(permissions);
        return userRepository.save(existing);
    }
}
