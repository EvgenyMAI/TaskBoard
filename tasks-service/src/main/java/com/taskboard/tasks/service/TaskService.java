package com.taskboard.tasks.service;

import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.entity.TaskHistory;
import com.taskboard.tasks.repository.TaskHistoryRepository;
import com.taskboard.tasks.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskHistoryRepository taskHistoryRepository;
    private final NotificationClient notificationClient;

    public void notifyTaskCreated(Task task, Long createdBy) {
        Long assigneeId = task.getAssigneeId();
        if (assigneeId != null && !assigneeId.equals(createdBy)) {
            notificationClient.createNotification(
                    assigneeId,
                    "TASK_ASSIGNED",
                    "Вам назначена задача",
                    "Задача: \"" + task.getTitle() + "\""
            );
        }
        notificationClient.createNotification(
                createdBy,
                "TASK_CREATED",
                "Задача создана",
                "Вы создали задачу: \"" + task.getTitle() + "\""
        );
    }

    @Transactional
    public Task updateTask(Long taskId, Task updated, Long changedBy) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));
        Long oldAssignee = task.getAssigneeId();
        Task.TaskStatus oldStatus = task.getStatus();

        recordIfChanged(task, "title", task.getTitle(), updated.getTitle(), changedBy);
        recordIfChanged(task, "description", task.getDescription(), updated.getDescription(), changedBy);
        recordIfChanged(task, "status",
                task.getStatus() != null ? task.getStatus().name() : null,
                updated.getStatus() != null ? updated.getStatus().name() : null,
                changedBy);
        recordIfChanged(task, "assigneeId",
                task.getAssigneeId() != null ? task.getAssigneeId().toString() : null,
                updated.getAssigneeId() != null ? updated.getAssigneeId().toString() : null,
                changedBy);
        recordIfChanged(task, "dueDate",
                task.getDueDate() != null ? task.getDueDate().toString() : null,
                updated.getDueDate() != null ? updated.getDueDate().toString() : null,
                changedBy);

        task.setTitle(updated.getTitle());
        task.setDescription(updated.getDescription());
        if (updated.getStatus() != null) task.setStatus(updated.getStatus());
        task.setAssigneeId(updated.getAssigneeId());
        task.setDueDate(updated.getDueDate());
        task.setUpdatedAt(Instant.now());

        Task saved = taskRepository.save(task);

        if (!Objects.equals(oldAssignee, saved.getAssigneeId()) && saved.getAssigneeId() != null) {
            notificationClient.createNotification(
                    saved.getAssigneeId(),
                    "TASK_REASSIGNED",
                    "Вам назначили задачу",
                    "Задача: \"" + saved.getTitle() + "\""
            );
        }
        if (oldStatus != saved.getStatus() && saved.getAssigneeId() != null) {
            notificationClient.createNotification(
                    saved.getAssigneeId(),
                    "TASK_STATUS_CHANGED",
                    "Изменился статус задачи",
                    "Задача: \"" + saved.getTitle() + "\", статус: " + saved.getStatus().name()
            );
        }
        if (oldStatus != saved.getStatus() && !Objects.equals(saved.getAssigneeId(), changedBy)) {
            notificationClient.createNotification(
                    changedBy,
                    "TASK_STATUS_CHANGED",
                    "Вы изменили статус задачи",
                    "Задача: \"" + saved.getTitle() + "\", новый статус: " + saved.getStatus().name()
            );
        }

        return saved;
    }

    private void recordIfChanged(Task task, String field, String oldVal, String newVal, Long changedBy) {
        if (Objects.equals(oldVal, newVal)) return;
        TaskHistory history = TaskHistory.builder()
                .task(task)
                .fieldName(field)
                .oldValue(oldVal)
                .newValue(newVal)
                .changedBy(changedBy)
                .changedAt(Instant.now())
                .build();
        taskHistoryRepository.save(history);
    }
}

