package com.taskboard.tasks.repository;

import com.taskboard.tasks.entity.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.project WHERE t.id = :id")
    Optional<Task> findByIdWithProject(@Param("id") Long id);

    List<Task> findByProject_Id(Long projectId);

    List<Task> findByAssigneeId(Long assigneeId);

    List<Task> findByProject_IdAndStatus(Long projectId, Task.TaskStatus status);

    @Query("SELECT t FROM Task t WHERE t.project.id = :projectId " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:assigneeId IS NULL OR t.assigneeId = :assigneeId)")
    Page<Task> findByProjectAndFilters(@Param("projectId") Long projectId,
                                       @Param("status") Task.TaskStatus status,
                                       @Param("assigneeId") Long assigneeId,
                                       Pageable pageable);

    List<Task> findByDueDateBeforeAndStatusNot(Instant dueDate, Task.TaskStatus status);
}
