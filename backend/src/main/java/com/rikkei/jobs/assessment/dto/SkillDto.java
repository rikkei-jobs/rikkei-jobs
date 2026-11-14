package com.rikkei.jobs.assessment.dto;

/** Public, immutable view of a catalogue skill shared with other modules. */
public record SkillDto(Integer id, String code, String name, String group) {}
