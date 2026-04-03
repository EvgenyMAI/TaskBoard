package com.taskboard.tasks.service;

import com.taskboard.tasks.entity.Project;
import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskQueryServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @InjectMocks
    private TaskQueryService service;

    private static UsernamePasswordAuthenticationToken auth(long userId, String... roles) {
        var authorities = java.util.Arrays.stream(roles)
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                .toList();
        return new UsernamePasswordAuthenticationToken(userId, null, authorities);
    }

    @Test
    void executorWithNoProjectsGetsEmptyPage() {
        when(projectMemberRepository.findProjectIdsByUserId(2L)).thenReturn(List.of());

        var res = service.listTasks(null, null, null, 0, 20, auth(2L, "EXECUTOR"));

        assertTrue(res.getStatusCode().is2xxSuccessful());
        Page<?> page = (Page<?>) res.getBody();
        assertTrue(page.isEmpty());
        verify(taskRepository, never()).findByProjectIdsAndFilters(any(), any(), any(), any());
    }

    @Test
    void executorFilteredOutOfForeignProjectReturnsEmptyPage() {
        when(projectMemberRepository.findProjectIdsByUserId(2L)).thenReturn(List.of(10L));

        var res = service.listTasks(99L, null, null, 0, 20, auth(2L, "EXECUTOR"));

        assertTrue(res.getStatusCode().is2xxSuccessful());
        Page<?> page = (Page<?>) res.getBody();
        assertTrue(page.isEmpty());
        verify(taskRepository, never()).findByProjectAndFilters(eq(99L), any(), any(), any());
    }

    @Test
    void executorInProjectUsesProjectScopedQuery() {
        when(projectMemberRepository.findProjectIdsByUserId(2L)).thenReturn(List.of(10L, 20L));
        Pageable pageable = PageRequest.of(0, 20);
        Page<Task> expected = new PageImpl<>(List.of());
        when(taskRepository.findByProjectAndFilters(10L, Task.TaskStatus.OPEN, null, pageable))
                .thenReturn(expected);

        var res = service.listTasks(10L, Task.TaskStatus.OPEN, null, 0, 20, auth(2L, "EXECUTOR"));

        assertEquals(expected, res.getBody());
    }

    @Test
    void executorWithoutProjectFilterUsesMembershipListQuery() {
        when(projectMemberRepository.findProjectIdsByUserId(2L)).thenReturn(List.of(1L, 2L));
        Pageable pageable = PageRequest.of(0, 20);
        Page<Task> expected = new PageImpl<>(List.of());
        when(taskRepository.findByProjectIdsAndFilters(List.of(1L, 2L), null, 5L, pageable))
                .thenReturn(expected);

        var res = service.listTasks(null, null, 5L, 0, 20, auth(2L, "EXECUTOR"));

        assertEquals(expected, res.getBody());
    }

    @Test
    void adminListsAllTasksWhenNoProjectFilter() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Task> expected = new PageImpl<>(List.of());
        when(taskRepository.findAll(pageable)).thenReturn(expected);

        var res = service.listTasks(null, null, null, 0, 20, auth(1L, "ADMIN"));

        assertEquals(expected, res.getBody());
        verify(projectMemberRepository, never()).findProjectIdsByUserId(any());
    }

    @Test
    void getTaskExecutorNotMemberReturnsNotFound() {
        Project p = new Project();
        p.setId(10L);
        Task task = Task.builder().id(1L).title("t").project(p).build();
        when(taskRepository.findByIdWithProject(1L)).thenReturn(Optional.of(task));
        when(projectMemberRepository.existsByIdProjectIdAndIdUserId(10L, 2L)).thenReturn(false);

        var res = service.getTask(1L, auth(2L, "EXECUTOR"));

        assertEquals(HttpStatus.NOT_FOUND, res.getStatusCode());
    }

    @Test
    void getTaskExecutorMemberReturnsOk() {
        Project p = new Project();
        p.setId(10L);
        Task task = Task.builder().id(1L).title("t").project(p).build();
        when(taskRepository.findByIdWithProject(1L)).thenReturn(Optional.of(task));
        when(projectMemberRepository.existsByIdProjectIdAndIdUserId(10L, 2L)).thenReturn(true);

        var res = service.getTask(1L, auth(2L, "EXECUTOR"));

        assertTrue(res.getStatusCode().is2xxSuccessful());
        assertEquals(task, res.getBody());
    }

    @Test
    void getTaskMissingReturnsNotFound() {
        when(taskRepository.findByIdWithProject(404L)).thenReturn(Optional.empty());

        var res = service.getTask(404L, auth(1L, "ADMIN"));

        assertEquals(HttpStatus.NOT_FOUND, res.getStatusCode());
    }
}
