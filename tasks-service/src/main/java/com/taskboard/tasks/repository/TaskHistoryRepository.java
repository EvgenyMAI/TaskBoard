package com.taskboard.tasks.repository;

import com.taskboard.tasks.entity.TaskHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskHistoryRepository extends JpaRepository<TaskHistory, Long> {

    List<TaskHistory> findByTaskIdOrderByChangedAtDesc(Long taskId, Pageable pageable);
}
