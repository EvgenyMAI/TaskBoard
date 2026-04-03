package com.taskboard.tasks;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskboard.tasks.service.AttachmentStorageService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TasksIntegrationTest {

    private static final String JWT_SECRET = "taskboard-auth-secret-key-min-256-bits-for-hs256";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AttachmentStorageService attachmentStorageService;

    private static String jwt(long userId, List<String> roles) {
        SecretKey key = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .claim("userId", userId)
                .claim("roles", roles)
                .issuedAt(java.util.Date.from(Instant.now()))
                .signWith(key)
                .compact();
    }

    @Test
    void rbacMembershipAndAttachmentsBasics() throws Exception {
        String adminToken = jwt(1L, List.of("ADMIN"));
        String execToken = jwt(2L, List.of("EXECUTOR"));

        // Admin creates project
        String projectJson = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"P1","description":"D1"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long projectId = objectMapper.readTree(projectJson).get("id").asLong();

        // Add executor to project
        mockMvc.perform(post("/api/projects/" + projectId + "/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":2}
                                """))
                .andExpect(status().isCreated());

        // Admin creates task assigned to executor
        String taskJson = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"T1","description":"D","status":"OPEN","assigneeId":2}
                                """.formatted(projectId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode taskNode = objectMapper.readTree(taskJson);
        long taskId = taskNode.get("id").asLong();

        // Executor can see tasks in their projects
        mockMvc.perform(get("/api/tasks?projectId=" + projectId + "&size=20")
                        .header("Authorization", "Bearer " + execToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // Attachment upload allowed for executor (assigned + member)
        when(attachmentStorageService.store(eq(taskId), any())).thenReturn("task-" + taskId + "/obj1.txt");
        when(attachmentStorageService.read(anyString())).thenReturn("hello".getBytes(StandardCharsets.UTF_8));

        MockMultipartFile file = new MockMultipartFile("file", "sample.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8));
        String attJson = mockMvc.perform(multipart("/api/tasks/" + taskId + "/attachments/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + execToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.storagePath").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        long attId = objectMapper.readTree(attJson).get("id").asLong();

        // Download returns bytes
        mockMvc.perform(get("/api/tasks/" + taskId + "/attachments/" + attId + "/download")
                        .header("Authorization", "Bearer " + execToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/plain"));

        // Executor cannot upload attachment to task not assigned to them
        String task2Json = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"T2","status":"OPEN","assigneeId":1}
                                """.formatted(projectId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long task2Id = objectMapper.readTree(task2Json).get("id").asLong();

        mockMvc.perform(multipart("/api/tasks/" + task2Id + "/attachments/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + execToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void createTaskWithNonMemberAssigneeForbidden() throws Exception {
        String adminToken = jwt(1L, List.of("ADMIN"));
        String projectJson = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"P-nonmember\",\"description\":\"d\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long projectId = objectMapper.readTree(projectJson).get("id").asLong();
        mockMvc.perform(post("/api/projects/" + projectId + "/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":2}"))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"X","status":"OPEN","assigneeId":99}
                                """.formatted(projectId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateTaskAssigneeMustBeProjectMember() throws Exception {
        String adminToken = jwt(1L, List.of("ADMIN"));
        String projectJson = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"P-update\",\"description\":\"d\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long projectId = objectMapper.readTree(projectJson).get("id").asLong();
        mockMvc.perform(post("/api/projects/" + projectId + "/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":2}"))
                .andExpect(status().isCreated());
        String taskJson = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"T-upd","status":"OPEN","assigneeId":2}
                                """.formatted(projectId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long taskId = objectMapper.readTree(taskJson).get("id").asLong();

        mockMvc.perform(put("/api/tasks/" + taskId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T-upd","description":"","status":"IN_PROGRESS","assigneeId":4,"dueDate":null}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateTaskAssigneeToAnotherMemberSucceeds() throws Exception {
        String adminToken = jwt(1L, List.of("ADMIN"));
        String projectJson = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"P-reassign\",\"description\":\"d\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long projectId = objectMapper.readTree(projectJson).get("id").asLong();
        mockMvc.perform(post("/api/projects/" + projectId + "/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":2}"))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/projects/" + projectId + "/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":3}"))
                .andExpect(status().isCreated());
        String taskJson = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"T-re","status":"OPEN","assigneeId":2}
                                """.formatted(projectId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long taskId = objectMapper.readTree(taskJson).get("id").asLong();

        mockMvc.perform(put("/api/tasks/" + taskId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T-re","description":"","status":"OPEN","assigneeId":3,"dueDate":null}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assigneeId").value(3));
    }

    @Test
    void updateTaskClearAssigneeAllowed() throws Exception {
        String adminToken = jwt(1L, List.of("ADMIN"));
        String projectJson = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"P-null-asg\",\"description\":\"d\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long projectId = objectMapper.readTree(projectJson).get("id").asLong();
        mockMvc.perform(post("/api/projects/" + projectId + "/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":2}"))
                .andExpect(status().isCreated());
        String taskJson = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"T-null","status":"OPEN","assigneeId":2}
                                """.formatted(projectId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long taskId = objectMapper.readTree(taskJson).get("id").asLong();

        mockMvc.perform(put("/api/tasks/" + taskId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T-null","description":"","status":"OPEN","assigneeId":null,"dueDate":null}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assigneeId").value(nullValue()));
    }

    @Test
    void managerCannotReassignTaskToNonProjectMember() throws Exception {
        String adminToken = jwt(1L, List.of("ADMIN"));
        String managerToken = jwt(10L, List.of("MANAGER"));
        String projectJson = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"P-mgr\",\"description\":\"d\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long projectId = objectMapper.readTree(projectJson).get("id").asLong();
        mockMvc.perform(post("/api/projects/" + projectId + "/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":2}"))
                .andExpect(status().isCreated());
        String taskJson = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"T-mgr","status":"OPEN","assigneeId":2}
                                """.formatted(projectId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long taskId = objectMapper.readTree(taskJson).get("id").asLong();

        mockMvc.perform(put("/api/tasks/" + taskId)
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"T-mgr","description":"","status":"OPEN","assigneeId":7,"dueDate":null}
                                """))
                .andExpect(status().isForbidden());
    }
}

