package com.example.recruitment.dto.response;

import com.example.recruitment.entity.Role;
import com.example.recruitment.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private Long id;
    private String email;
    private String fullName;
    private Role role;
    private Long companyId;
    private boolean mustChangePassword;

    public static UserResponse fromEntity(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .companyId(user.getCompanyId())
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }
}
