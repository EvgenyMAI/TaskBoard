package com.taskboard.tasks.dto;

import com.taskboard.tasks.entity.Task;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;

@Data
public class TaskWriteDto {
    private Long projectId;
    @NotBlank
    private String title;
    private String description;
    private Task.TaskStatus status;
    private Long assigneeId;
    private Instant dueDate;
}
