package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Category;
import com.example.EMLANET_SHOP.Exception.DuplicateResourceException;
import com.example.EMLANET_SHOP.Exception.ResourceNotFoundException;
import com.example.EMLANET_SHOP.Repository.CategoryRepository;
import com.example.EMLANET_SHOP.Service.CategoryService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryServiceImpl(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional
    public Category save(Category category) {
        try {
            return categoryRepository.save(category);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Category '" + category.getName() + "' already exists");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
    }

    @Override
    @Transactional
    public Category updateCategory(Category category) {
        Category existingCategory = categoryRepository.findById(category.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        existingCategory.setName(category.getName());
        existingCategory.setDescription(category.getDescription());
        try {
            return categoryRepository.save(existingCategory);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Category '" + category.getName() + "' already exists");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Category> getAll() {
        return categoryRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteCategoryById(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found");
        }
        categoryRepository.deleteById(id);
    }
}
