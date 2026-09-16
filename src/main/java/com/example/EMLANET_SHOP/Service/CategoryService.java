package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Category;

import java.util.List;

public interface CategoryService {

    Category save(Category category);

    Category getCategoryById(Long id);

    Category updateCategory(Category category);

    List<Category> getAll();

    void deleteCategoryById(Long id);
}
