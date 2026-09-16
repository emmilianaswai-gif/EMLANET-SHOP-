package com.example.EMLANET_SHOP.Controller;
import com.example.EMLANET_SHOP.Entity.Debt;
import com.example.EMLANET_SHOP.Service.DebtService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
@RestController
@RequestMapping("/api/debts")
public class DebtController {
    private final DebtService debtService;
    public DebtController(
            DebtService debtService
    ){
        this.debtService = debtService;
    }
// GET
    @GetMapping
    public List<Debt> getAll(){
        return debtService.getAllDebts();
    }
// POST
    @PostMapping
    public Debt save(
            @RequestBody Debt debt
    ){
        return debtService.saveDebt(debt);
    }
// UPDATE

    @PutMapping("/{id}")
    public Debt update(
            @PathVariable Long id,
            @RequestBody Debt debt
    ){

        return debtService.updateDebt(id,debt);
    }
// DELETE

    @DeleteMapping("/{id}")
    public void delete(
            @PathVariable Long id
    ){

        debtService.deleteDebt(id);

    }
// PAYMENT

    @PutMapping("/{id}/payment")
    public Debt payment(
            @PathVariable Long id,
            @RequestBody Map<String,Double> body
    ){

        return debtService.addPayment(
                id,
                body.get("payment")
        );
    }
}