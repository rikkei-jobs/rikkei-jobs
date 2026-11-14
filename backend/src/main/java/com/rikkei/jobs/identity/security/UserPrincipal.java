package com.rikkei.jobs.identity.security;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Custom UserDetails principal holding authenticated user identity and claims. */
public class UserPrincipal implements UserDetails {

    private static final long serialVersionUID = 1L;

    private final Long id;
    private final String email;
    private final String roleName;
    private final Long companyId;
    private final boolean mustChangePassword;

    public UserPrincipal(
            Long id, String email, String roleName, Long companyId, boolean mustChangePassword) {
        this.id = id;
        this.email = email;
        this.roleName = roleName;
        this.companyId = companyId;
        this.mustChangePassword = mustChangePassword;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getRoleName() {
        return roleName;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + roleName));
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
