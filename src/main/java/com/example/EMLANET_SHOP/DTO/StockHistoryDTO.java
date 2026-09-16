package com.example.EMLANET_SHOP.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockHistoryDTO {

    private Long id;

    private String productName;

    private Integer quantity;

    private String changeType;

    private String date;
}