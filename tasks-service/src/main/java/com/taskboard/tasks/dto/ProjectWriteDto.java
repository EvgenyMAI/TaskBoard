package com.taskboard.tasks.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ProjectWriteDto {
    @NotBlank
    private String name;
    private String description;
}
