package com.example.EMLANET_SHOP.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserRequestDTO() {
    @NotBlank(message = "The product name cannot be blank")
    static String name;
    @Size(message = "min = 6, message = \"Password must be at least 6 characters long")
    static String password;
    @NotBlank(message = "Role cannot be blank")
    static String role;

}
