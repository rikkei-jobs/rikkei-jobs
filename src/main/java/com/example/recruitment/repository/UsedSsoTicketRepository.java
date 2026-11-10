package com.example.recruitment.repository;

import com.example.recruitment.entity.UsedSsoTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UsedSsoTicketRepository extends JpaRepository<UsedSsoTicket, String> {
}
