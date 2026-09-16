package com.example.EMLANET_SHOP.Controller;

import com.example.EMLANET_SHOP.Entity.PocketCollection;
import com.example.EMLANET_SHOP.Entity.PocketWithdrawal;
import com.example.EMLANET_SHOP.Repository.PocketCollectionRepository;
import com.example.EMLANET_SHOP.Repository.PocketWithdrawalRepository;
import com.example.EMLANET_SHOP.Service.DebtService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/pocket")
public class PocketController {

    private final PocketCollectionRepository collectionRepo;
    private final PocketWithdrawalRepository withdrawalRepo;
    private final DebtService debtService;

    private static final Set<String> DEBT_PURPOSES = Set.of(
        "Debt Payment", "Partial Payment", "Full Settlement"
    );

    public PocketController(PocketCollectionRepository collectionRepo,
                            PocketWithdrawalRepository withdrawalRepo,
                            DebtService debtService) {
        this.collectionRepo = collectionRepo;
        this.withdrawalRepo = withdrawalRepo;
        this.debtService = debtService;
    }

    @GetMapping("/collections")
    public List<PocketCollection> getAllCollections() {
        return collectionRepo.findAll();
    }

    @PostMapping("/collections")
    public PocketCollection createCollection(@RequestBody PocketCollection collection) {
        PocketCollection saved = collectionRepo.save(collection);
        if (collection.getCustomerId() != null
                && collection.getAmount() != null
                && collection.getAmount() > 0
                && DEBT_PURPOSES.contains(collection.getPurpose())) {
            debtService.addPaymentByCustomerId(collection.getCustomerId(), collection.getAmount());
        }
        return saved;
    }

    @PutMapping("/collections/{id}")
    public PocketCollection updateCollection(@PathVariable Long id, @RequestBody PocketCollection collection) {
        collection.setId(id);
        return collectionRepo.save(collection);
    }

    @DeleteMapping("/collections/{id}")
    public void deleteCollection(@PathVariable Long id) {
        collectionRepo.deleteById(id);
    }

    @GetMapping("/withdrawals")
    public List<PocketWithdrawal> getAllWithdrawals() {
        return withdrawalRepo.findAll();
    }

    @PostMapping("/withdrawals")
    public PocketWithdrawal createWithdrawal(@RequestBody PocketWithdrawal withdrawal) {
        return withdrawalRepo.save(withdrawal);
    }

    @PutMapping("/withdrawals/{id}")
    public PocketWithdrawal updateWithdrawal(@PathVariable Long id, @RequestBody PocketWithdrawal withdrawal) {
        withdrawal.setId(id);
        return withdrawalRepo.save(withdrawal);
    }

    @DeleteMapping("/withdrawals/{id}")
    public void deleteWithdrawal(@PathVariable Long id) {
        withdrawalRepo.deleteById(id);
    }
}
