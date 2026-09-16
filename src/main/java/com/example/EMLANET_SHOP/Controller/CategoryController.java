package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.DTO.CategoryDTO;
import com.example.EMLANET_SHOP.Entity.Category;
import com.example.EMLANET_SHOP.Service.CategoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public CategoryDTO save(@RequestBody Category category) {
        return convertToDTO(categoryService.save(category));
    }

    @PutMapping("/{id}")
    public CategoryDTO update(@PathVariable Long id, @RequestBody Category category) {
        category.setId(id);
        return convertToDTO(categoryService.updateCategory(category));
    }

    @GetMapping
    public List<CategoryDTO> getAll() {
        return categoryService.getAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public CategoryDTO getById(@PathVariable Long id) {
        return convertToDTO(categoryService.getCategoryById(id));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        categoryService.deleteCategoryById(id);
    }

    // Helper method to safely strip Hibernate proxies before serialization
    private CategoryDTO convertToDTO(Category category) {
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        return dto;
    }
}