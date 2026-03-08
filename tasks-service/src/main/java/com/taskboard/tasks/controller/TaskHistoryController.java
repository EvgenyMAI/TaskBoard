package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.TaskHistory;
import com.taskboard.tasks.repository.TaskHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks/{taskId}/history")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TaskHistoryController {

    private final TaskHistoryRepository taskHistoryRepository;

    @GetMapping
    public ResponseEntity<List<TaskHistory>> list(@PathVariable Long taskId,
                                                   @RequestParam(defaultValue = "50") int limit) {
        List<TaskHistory> history = taskHistoryRepository.findByTaskIdOrderByChangedAtDesc(
                taskId, PageRequest.of(0, limit));
        return ResponseEntity.ok(history);
    }
}
