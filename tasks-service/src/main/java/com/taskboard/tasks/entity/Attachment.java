package com.taskboard.tasks.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "attachments")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** URL download endpoint for this attachment. */
    @NotBlank
    @Column(nullable = false, length = 1024)
    private String filePathOrUrl;

    @Column(length = 255)
    private String fileName;

    @Column(name = "mime_type", length = 255)
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    /**
     * Kept for backward-compatible schema; URL attachments are disabled in API.
     */
    @Column(name = "external_link", nullable = false)
    @Builder.Default
    private Boolean externalLink = false;

    /**
     * Kept for backward-compatible schema with previous file-storage model.
     */
    @Column(name = "storage_path", length = 1024)
    private String storagePath;

    @Column(name = "uploaded_by")
    private Long uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    @Builder.Default
    private Instant uploadedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    @JsonIgnore
    private Task task;
}
