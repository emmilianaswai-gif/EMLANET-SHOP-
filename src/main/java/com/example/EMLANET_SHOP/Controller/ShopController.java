package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Shop;
import com.example.EMLANET_SHOP.Repository.ShopRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shops")
public class ShopController {

    private final ShopRepository shopRepository;

    public ShopController(ShopRepository shopRepository) {
        this.shopRepository = shopRepository;
    }

    @GetMapping
    public List<Shop> getAllShops() {
        return shopRepository.findAll();
    }

    @GetMapping("/{id}")
    public Shop getShop(@PathVariable Long id) {
        return shopRepository.findById(id).orElse(null);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Shop createShop(@RequestBody Shop shop) {
        if (shop.getName() == null || shop.getName().isBlank()) {
            throw new RuntimeException("Shop name is required");
        }
        shop.setId(null);
        return shopRepository.save(shop);
    }

    @PutMapping("/{id}")
    public Shop updateShop(@PathVariable Long id, @RequestBody Shop shop) {
        return shopRepository.findById(id).map(existing -> {
            if (shop.getName() != null && !shop.getName().isBlank()) {
                existing.setName(shop.getName());
            }
            if (shop.getAddress() != null) existing.setAddress(shop.getAddress());
            if (shop.getPhone() != null) existing.setPhone(shop.getPhone());
            if (shop.getLocation() != null) existing.setLocation(shop.getLocation());
            return shopRepository.save(existing);
        }).orElse(null);
    }

    @DeleteMapping("/{id}")
    public void deleteShop(@PathVariable Long id) {
        shopRepository.deleteById(id);
    }
}
