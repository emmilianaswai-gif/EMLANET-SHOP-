package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Expense;
import com.example.EMLANET_SHOP.Repository.ExpenseRepository;
import com.example.EMLANET_SHOP.Service.ExpenseService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;

    public ExpenseServiceImpl(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    @Override
    public Expense saveExpense(Expense expense) {
        return expenseRepository.save(expense);
    }

    @Override
    public Expense getExpenseById(Long id) {
        return expenseRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Expense not found with id: " + id));
    }

    @Override
    public List<Expense> getAll() {
        return expenseRepository.findAll();
    }

    @Override
    public void deleteExpenseById(Long id) {
        if (!expenseRepository.existsById(id)) {
            throw new RuntimeException("Expense not found with id: " + id);
        }

        expenseRepository.deleteById(id);
    }
}