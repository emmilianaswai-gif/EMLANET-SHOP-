package com.example.EMLANET_SHOP.DTO;

import lombok.Data;

@Data
public class ProductDTO {
    private String name;
    private Double price;
    private String expiryDate;
    private Long categoryId;
    private Long supplierId;
    private String sku;
    private String unit;
}
