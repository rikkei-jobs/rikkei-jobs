package com.example.recruitment.repository;

import com.example.recruitment.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    /**
     * Kiểm tra xem ứng viên với email cụ thể đã nộp hồ sơ vào job này chưa.
     */
    boolean existsByJobIdAndEmail(Long jobId, String email);

    List<Application> findByJobId(Long jobId);
}
