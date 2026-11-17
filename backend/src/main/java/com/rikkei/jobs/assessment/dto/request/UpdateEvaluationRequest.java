package com.rikkei.jobs.assessment.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateEvaluationRequest(
        @Size(max = 5000, message = "Nhận xét chung không được vượt quá 5000 ký tự")
                String overallComment,
        @NotNull(message = "Danh sách điểm không được để trống") @Valid List<ScoreRequest> scores) {
    public record ScoreRequest(
            @NotNull(message = "Mã tiêu chí không được để trống") Long criterionId,
            @Min(value = 0, message = "Điểm đánh giá tối thiểu là 0")
                    @Max(value = 100, message = "Điểm đánh giá tối đa là 100")
                    Integer score,
            @Size(max = 2000, message = "Nhận xét tiêu chí không được vượt quá 2000 ký tự")
                    String comment) {}
}
