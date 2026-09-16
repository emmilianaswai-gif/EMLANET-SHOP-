package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.Expense;
import com.example.EMLANET_SHOP.Service.ExpenseService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @PostMapping
    public Expense save(@RequestBody Expense expense) {
        return expenseService.saveExpense(expense);
    }

    @GetMapping
    public List<Expense> getAll() {
        return expenseService.getAll();
    }

    @GetMapping("/{id}")
    public Expense getById(@PathVariable Long id) {
        return expenseService.getExpenseById(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        expenseService.deleteExpenseById(id);
    }
}