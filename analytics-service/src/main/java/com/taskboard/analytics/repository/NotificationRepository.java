package com.taskboard.analytics.repository;

import com.taskboard.analytics.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, Long>, JpaSpecificationExecutor<NotificationEntity> {

    long countByUserIdAndReadFalse(Long userId);

    Optional<NotificationEntity> findByIdAndUserId(Long id, Long userId);
}
