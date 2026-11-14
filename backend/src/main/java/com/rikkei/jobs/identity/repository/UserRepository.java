package com.rikkei.jobs.identity.repository;

import com.rikkei.jobs.identity.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByLmsUserId(String lmsUserId);

    boolean existsByEmail(String email);

    boolean existsByLmsUserId(String lmsUserId);

    @Query("SELECT u FROM User u JOIN FETCH u.role WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> findByEmailIgnoreCaseWithRole(@Param("email") String email);
}
