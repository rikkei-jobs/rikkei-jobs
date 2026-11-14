package com.rikkei.jobs.identity.service;

import com.rikkei.jobs.identity.AuthenticatedUser;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads users by email for HTTP Basic authentication. Interim mechanism until the SSO ticket login
 * (NT-01) issues stateless tokens; the principal shape ({@link AuthenticatedUser}) stays the same.
 */
@Service
public class DatabaseUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public DatabaseUserDetailsService(
            UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        User user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(() -> new UsernameNotFoundException("Unknown user"));
        String role =
                roleRepository
                        .findById(user.getRoleId())
                        .map(Role::getName)
                        .orElseThrow(() -> new UsernameNotFoundException("Unknown role"));
        return new AuthenticatedUser(user.getId(), user.getEmail(), user.getPasswordHash(), role);
    }
}
