package com.taskboard.tasks.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProjectMemberRequestDto {
    @NotNull
    private Long userId;
}
