package com.example.EMLANET_SHOP.Entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
    SUPER_ADMIN,
    ADMIN,
    MANAGER,
    EMPLOYEE,
    CASHIER,
    CLERK,
    CUSTOMER,
    USER;

    @JsonCreator
    public static Role fromString(String value) {
        if (value == null || value.isBlank()) return null;
        return valueOf(value.trim().toUpperCase());
    }

    @JsonValue
    public String toValue() {
        return this.name().toLowerCase();
    }
}
