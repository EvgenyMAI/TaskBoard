package com.taskboard.tasks.repository;

import com.taskboard.tasks.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    List<Attachment> findByTaskId(Long taskId);

    Optional<Attachment> findByIdAndTaskId(Long id, Long taskId);
}
