package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Role;
import com.example.EMLANET_SHOP.Entity.User;

import java.util.List;

public interface UserService {

    User createUser(User user);

    User getUserById(Long id);

    List<User> getAllUsers();

    List<User> getUsersByRole(Role role);

    List<User> getUsersByShopId(Long shopId);

    void deleteUserById(Long id);

    User updateUser(Long id, User user);

    User changeRole(Long id, Role role);

    User updatePermissions(Long id, String permissions);
}
