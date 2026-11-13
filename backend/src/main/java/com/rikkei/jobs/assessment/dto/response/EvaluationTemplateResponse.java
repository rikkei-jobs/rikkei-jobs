package com.rikkei.jobs.assessment.dto.response;

import com.rikkei.jobs.assessment.model.EvaluationContext;
import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationTemplateResponse {

    private Long id;

    private String name;

    private String position;

    private EvaluationContext context;

    private Boolean active;

    private List<CriteriaResponse> criteria;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CriteriaResponse {

        private Long id;

        private Long skillId;

        private String description;

        private BigDecimal weight;
    }
}
