package com.taskboard.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String username;
    /** Для админского UI (поиск в профиле); не секрет, но не показывать без необходимости. */
    private String email;
    private Set<String> roles;
}
