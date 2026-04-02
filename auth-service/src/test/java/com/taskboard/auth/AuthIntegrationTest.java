package com.taskboard.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void registerLoginAndRoleUpdateHappyPath() throws Exception {
        // Register first user -> ADMIN
        String adminReg = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"admin1","password":"password123","email":"admin1@example.com"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode adminJson = objectMapper.readTree(adminReg);
        String adminToken = adminJson.get("accessToken").asText();
        long adminUserId = adminJson.get("userId").asLong();
        assertTrue(adminJson.get("roles").toString().contains("ADMIN"));

        // Register second user -> EXECUTOR
        String execReg = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"exec1","password":"password123","email":"exec1@example.com"}
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode execJson = objectMapper.readTree(execReg);
        long execUserId = execJson.get("userId").asLong();
        assertTrue(execJson.get("roles").toString().contains("EXECUTOR"));

        // Login works
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"exec1","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.userId").value(execUserId));

        // Validate works
        mockMvc.perform(get("/api/auth/validate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));

        // Non-admin cannot update roles
        String execToken = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"exec1","password":"password123"}
                                """))
                .andReturn().getResponse().getContentAsString();
        String execAccess = objectMapper.readTree(execToken).get("accessToken").asText();
        mockMvc.perform(put("/api/auth/users/" + adminUserId + "/roles")
                        .header("Authorization", "Bearer " + execAccess)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roles":["MANAGER"]}
                                """))
                .andExpect(status().isForbidden());

        // Admin can update roles
        String updated = mockMvc.perform(put("/api/auth/users/" + execUserId + "/roles")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roles":["MANAGER"]}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode updatedJson = objectMapper.readTree(updated);
        assertEquals(execUserId, updatedJson.get("id").asLong());
        assertTrue(updatedJson.get("roles").toString().contains("MANAGER"));

        // GET /api/users: сводки с email (профиль админа, назначение исполнителей)
        String userList = mockMvc.perform(get("/api/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode usersArr = objectMapper.readTree(userList);
        assertTrue(usersArr.isArray());
        assertTrue(usersArr.size() >= 2);
        boolean seenAdmin = false;
        boolean seenExec = false;
        for (JsonNode u : usersArr) {
            assertTrue(u.hasNonNull("id"));
            assertTrue(u.hasNonNull("username"));
            assertTrue(u.has("email"));
            assertTrue(u.has("roles"));
            String un = u.get("username").asText();
            if ("admin1".equals(un)) {
                assertEquals("admin1@example.com", u.get("email").asText());
                assertTrue(u.get("roles").toString().contains("ADMIN"));
                seenAdmin = true;
            }
            if ("exec1".equals(un)) {
                assertEquals("exec1@example.com", u.get("email").asText());
                assertTrue(u.get("roles").toString().contains("MANAGER"));
                seenExec = true;
            }
        }
        assertTrue(seenAdmin, "admin1 должен быть в списке пользователей");
        assertTrue(seenExec, "exec1 должен быть в списке пользователей");
    }
}

