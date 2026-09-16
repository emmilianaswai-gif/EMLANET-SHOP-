package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Expense;

import java.util.List;

public interface ExpenseService {

    Expense saveExpense(Expense expense);

    Expense getExpenseById(Long id);

    List<Expense> getAll();

    void deleteExpenseById(Long id);
}
