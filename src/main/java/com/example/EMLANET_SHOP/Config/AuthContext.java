package com.example.EMLANET_SHOP.Config;

public final class AuthContext {

    private static final ThreadLocal<Long> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<Long> SHOP_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> ROLE = new ThreadLocal<>();

    private AuthContext() {
    }

    public static void set(Long userId, Long shopId, String role) {
        USER_ID.set(userId);
        SHOP_ID.set(shopId);
        ROLE.set(role);
    }

    public static Long getUserId() {
        return USER_ID.get();
    }

    public static Long getShopId() {
        return SHOP_ID.get();
    }

    public static String getRole() {
        return ROLE.get();
    }

    public static void clear() {
        USER_ID.remove();
        SHOP_ID.remove();
        ROLE.remove();
    }
}
