package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Debt;

import java.util.List;

public interface DebtService {


    List<Debt> getAllDebts();


    Debt getDebtById(Long id);


    Debt saveDebt(Debt debt);


    Debt updateDebt(Long id, Debt debt);


    void deleteDebt(Long id);


    Debt addPayment(Long id, double payment);

    void addPaymentByCustomerId(Long customerId, double payment);

}