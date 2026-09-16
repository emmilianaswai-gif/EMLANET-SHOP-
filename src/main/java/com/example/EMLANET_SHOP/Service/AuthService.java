package com.example.EMLANET_SHOP.Service;

import java.util.Map;

public interface AuthService {
    Map<String, Object> login(String username, String password);

    Map<String, Object> register(String shopName, String shopAddress, String shopPhone, String shopLocation,
                                 String username, String password, String fullName, String email, String phone);

    void logout(String token);
}
