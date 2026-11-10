package com.example.recruitment.repository;

import com.example.recruitment.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByLmsUserId(String lmsUserId);
    boolean existsByEmail(String email);
}
