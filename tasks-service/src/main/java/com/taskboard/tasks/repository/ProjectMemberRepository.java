package com.taskboard.tasks.repository;

import com.taskboard.tasks.entity.ProjectMember;
import com.taskboard.tasks.entity.ProjectMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, ProjectMemberId> {

    boolean existsByIdProjectIdAndIdUserId(Long projectId, Long userId);

    List<ProjectMember> findByIdProjectId(Long projectId);

    @Query("select distinct pm.id.projectId from ProjectMember pm where pm.id.userId = :userId")
    List<Long> findProjectIdsByUserId(Long userId);

    @Query("select pm.id.userId from ProjectMember pm where pm.id.projectId = :projectId")
    List<Long> findUserIdsByProjectId(Long projectId);
}

