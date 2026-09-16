package com.example.EMLANET_SHOP.Service;

import com.example.EMLANET_SHOP.Entity.Customer;

import java.util.List;

public interface CustomerService {

    Customer save(Customer customer);

    Customer getCustomerById(Long id);

    List<Customer> getAll();

    Customer updateCustomer(Long id, Customer customer);

    Customer addPayment(Long id, double payment);

    void deleteCustomerById(Long id);
}
