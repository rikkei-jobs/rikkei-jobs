package com.example.recruitment.config;

import com.example.recruitment.entity.Role;
import com.example.recruitment.entity.User;
import com.example.recruitment.entity.UserStatus;
import com.example.recruitment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        User hr1 = userRepository.findByEmail("hr1@company.com").orElse(null);
        if (hr1 == null) {
            hr1 = User.builder()
                    .email("hr1@company.com")
                    .passwordHash(passwordEncoder.encode("Hr@123456"))
                    .fullName("HR Manager 1")
                    .role(Role.HR)
                    .companyId(1L)
                    .mustChangePassword(true) // Lần đầu đăng nhập bắt buộc đổi mật khẩu
                    .failedLoginCount(0)
                    .status(UserStatus.ACTIVE)
                    .build();
            userRepository.save(hr1);
        } else {
            // Đảm bảo mật khẩu luôn đúng Hr@123456 mỗi khi khởi động lại ứng dụng
            hr1.setPasswordHash(passwordEncoder.encode("Hr@123456"));
            hr1.setFailedLoginCount(0);
            hr1.setLockedUntil(null);
            hr1.setStatus(UserStatus.ACTIVE);
            userRepository.save(hr1);
        }
        log.info("===> [DATA SEED] Sẵn sàng tài khoản HR: hr1@company.com / Hr@123456");
    }
}
