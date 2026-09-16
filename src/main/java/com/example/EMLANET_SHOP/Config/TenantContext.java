package com.example.EMLANET_SHOP.Config;

public final class TenantContext {

    private static final ThreadLocal<Long> SHOP_ID = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setShopId(Long shopId) {
        SHOP_ID.set(shopId);
    }

    public static Long getShopId() {
        return SHOP_ID.get();
    }

    public static void clear() {
        SHOP_ID.remove();
    }
}
