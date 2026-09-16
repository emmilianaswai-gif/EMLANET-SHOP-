package com.example.EMLANET_SHOP.ServiceImpl;

import com.example.EMLANET_SHOP.Entity.Customer;
import com.example.EMLANET_SHOP.Repository.CustomerRepository;
import com.example.EMLANET_SHOP.Service.CustomerService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerServiceImpl(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Override
    @Transactional
    public Customer save(Customer customer) {
        return customerRepository.save(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Customer> getAll() {
        return customerRepository.findAll();
    }

    @Override
    @Transactional
    public Customer updateCustomer(Long id, Customer updated) {
        Customer existing = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found with id: " + id));
        if (updated.getName() != null) existing.setName(updated.getName());
        if (updated.getPhone() != null) existing.setPhone(updated.getPhone());
        if (updated.getEmail() != null) existing.setEmail(updated.getEmail());
        if (updated.getAddress() != null) existing.setAddress(updated.getAddress());
        if (updated.getType() != null) existing.setType(updated.getType());
        if (updated.getNotes() != null) existing.setNotes(updated.getNotes());
        if (updated.getProduct() != null) existing.setProduct(updated.getProduct());
        return customerRepository.save(existing);
    }

    @Override
    @Transactional
    public Customer addPayment(Long id, double payment) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found with id: " + id));
        customer.setPaid(customer.getPaid() + payment);
        return customerRepository.save(customer);
    }

    @Override
    @Transactional
    public void deleteCustomerById(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new RuntimeException("Customer not found with id: " + id);
        }
        customerRepository.deleteById(id);
    }
}
