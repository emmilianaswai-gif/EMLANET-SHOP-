package com.example.EMLANET_SHOP.ServiceImpl;


import com.example.EMLANET_SHOP.Entity.Debt;
import com.example.EMLANET_SHOP.Repository.DebtRepository;
import com.example.EMLANET_SHOP.Service.DebtService;

import org.springframework.stereotype.Service;

import java.util.List;


@Service
public class DebtServiceImpl implements DebtService {


    private final DebtRepository debtRepository;



    public DebtServiceImpl(
            DebtRepository debtRepository
    ){

        this.debtRepository = debtRepository;

    }
    @Override
    public List<Debt> getAllDebts(){
        return debtRepository.findAll();
    }
    @Override
    public Debt getDebtById(Long id){
        return debtRepository
                .findById(id)
                .orElseThrow(
                        ()-> new RuntimeException("Debt not found")
                );
    }



    @Override
    public Debt saveDebt(Debt debt){

        return debtRepository.save(debt);

    }



    @Override
    public Debt updateDebt(
            Long id,
            Debt data
    ){

        Debt debt = getDebtById(id);


        debt.setAmount(data.getAmount());
        debt.setDescription(data.getDescription());


        return debtRepository.save(debt);

    }



    @Override
    public void deleteDebt(Long id){

        debtRepository.deleteById(id);

    }



    @Override
    public Debt addPayment(
            Long id,
            double payment
    ){
        Debt debt = getDebtById(id);
        debt.setAmount(
                Math.max(0, debt.getAmount() - payment)
        );
        return debtRepository.save(debt);

    }

    @Override
    public void addPaymentByCustomerId(Long customerId, double payment) {
        if (payment <= 0) return;
        List<Debt> debts = debtRepository.findByCustomerId(customerId);
        if (debts.isEmpty()) return;
        double remaining = payment;
        for (Debt debt : debts) {
            if (remaining <= 0) break;
            double current = debt.getAmount();
            if (current <= 0) continue;
            double deduct = Math.min(current, remaining);
            debt.setAmount(current - deduct);
            debtRepository.save(debt);
            remaining -= deduct;
        }
    }

}