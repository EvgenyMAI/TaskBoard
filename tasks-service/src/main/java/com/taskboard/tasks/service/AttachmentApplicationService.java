package com.taskboard.tasks.service;

import com.taskboard.tasks.entity.Attachment;
import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.repository.AttachmentRepository;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.TaskRepository;
import com.taskboard.tasks.security.RoleAuthorization;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AttachmentApplicationService {

    private static final long MAX_FILE_BYTES = 25L * 1024 * 1024;

    private final AttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final AttachmentStorageService attachmentStorageService;

    public ResponseEntity<List<Attachment>> list(Long taskId, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        return taskRepository.findByIdWithProject(taskId)
                .map(task -> {
                    if (isExecutor) {
                        Long taskProjectId = task.getProjectId();
                        boolean isMember = taskProjectId != null
                                && projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId);
                        if (!isMember) {
                            return ResponseEntity.ok(List.<Attachment>of());
                        }
                    }
                    return ResponseEntity.ok(attachmentRepository.findByTaskId(taskId));
                })
                .orElse(ResponseEntity.<List<Attachment>>notFound().build());
    }

    @Transactional
    public ResponseEntity<Attachment> upload(Long taskId,
                                               MultipartFile file,
                                               Authentication auth,
                                               HttpServletRequest request) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        return taskRepository.findById(taskId)
                .map(task -> {
                    if (!canWriteAttachments(task, userId, isExecutor)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<Attachment>build();
                    }
                    if (file == null || file.isEmpty()) {
                        return ResponseEntity.badRequest().<Attachment>build();
                    }
                    String originalName = file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()
                            ? "attachment"
                            : file.getOriginalFilename().trim();
                    String mimeType = file.getContentType();
                    long fileSize = file.getSize();
                    if (fileSize <= 0) {
                        return ResponseEntity.badRequest().<Attachment>build();
                    }
                    if (fileSize > MAX_FILE_BYTES) {
                        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).<Attachment>build();
                    }
                    String objectKey;
                    try {
                        objectKey = attachmentStorageService.store(taskId, file);
                    } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST).<Attachment>build();
                    }

                    Attachment att = Attachment.builder()
                            .fileName(originalName)
                            .filePathOrUrl("pending")
                            .mimeType(mimeType)
                            .fileSize(fileSize)
                            .externalLink(false)
                            .storagePath(objectKey)
                            .uploadedBy(userId)
                            .task(task)
                            .build();
                    att = attachmentRepository.save(att);
                    att.setFilePathOrUrl(buildDownloadUrl(request, taskId, att.getId()));
                    att = attachmentRepository.save(att);
                    return ResponseEntity.status(201).body(att);
                })
                .orElse(ResponseEntity.<Attachment>notFound().build());
    }

    public ResponseEntity<Resource> download(Long taskId, Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        Attachment att = attachmentRepository.findByIdAndTaskId(id, taskId).orElse(null);
        Task task = taskRepository.findByIdWithProject(taskId).orElse(null);
        if (att == null || task == null) {
            return ResponseEntity.notFound().build();
        }
        if (!canReadTask(task, userId, isExecutor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        byte[] bytes = readAttachmentBytes(att);
        if (bytes == null || bytes.length == 0) {
            return ResponseEntity.notFound().build();
        }
        MediaType mt = parseMediaType(att.getMimeType());
        Resource resource = new ByteArrayResource(bytes);
        return ResponseEntity.ok()
                .contentType(mt)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\""
                        + (att.getFileName() == null ? "attachment" : att.getFileName()) + "\"")
                .body(resource);
    }

    public ResponseEntity<Resource> preview(Long taskId, Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Attachment att = attachmentRepository.findByIdAndTaskId(id, taskId).orElse(null);
        Task task = taskRepository.findByIdWithProject(taskId).orElse(null);
        if (att == null || task == null) {
            return ResponseEntity.notFound().build();
        }
        if (!canReadTask(task, userId, isExecutor)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        byte[] bytes = readAttachmentBytes(att);
        if (bytes == null || bytes.length == 0) {
            return ResponseEntity.notFound().build();
        }
        MediaType mt = parseMediaType(att.getMimeType());
        if (!isPreviewable(mt)) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).build();
        }
        return ResponseEntity.ok()
                .contentType(mt)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\""
                        + (att.getFileName() == null ? "attachment" : att.getFileName()) + "\"")
                .body(new ByteArrayResource(bytes));
    }

    @Transactional
    public ResponseEntity<Void> delete(Long taskId, Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Attachment att = attachmentRepository.findByIdAndTaskId(id, taskId).orElse(null);
        if (att == null) {
            return ResponseEntity.notFound().build();
        }

        if (isExecutor) {
            if (att.getUploadedBy() == null || !att.getUploadedBy().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            if (att.getTask() != null && att.getTask().getId() != null && !att.getTask().getId().equals(taskId)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        }

        attachmentStorageService.deleteQuietly(att.getStoragePath());
        attachmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private boolean canReadTask(Task task, Long userId, boolean isExecutor) {
        if (!isExecutor) {
            return true;
        }
        Long taskProjectId = task.getProjectId();
        return taskProjectId != null && projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId);
    }

    private boolean canWriteAttachments(Task task, Long userId, boolean isExecutor) {
        if (!isExecutor) {
            return true;
        }
        if (task.getAssigneeId() == null || !task.getAssigneeId().equals(userId)) {
            return false;
        }
        Long taskProjectId = task.getProjectId();
        return taskProjectId != null && projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId);
    }

    private String buildDownloadUrl(HttpServletRequest request, Long taskId, Long attachmentId) {
        String base = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();
        return base + "/api/tasks/" + taskId + "/attachments/" + attachmentId + "/download";
    }

    private MediaType parseMediaType(String value) {
        if (value == null || value.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(value);
        } catch (Exception ignored) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private byte[] readAttachmentBytes(Attachment att) {
        String storagePath = att.getStoragePath();
        if (storagePath != null && !storagePath.isBlank()) {
            return attachmentStorageService.read(storagePath);
        }
        return null;
    }

    private boolean isPreviewable(MediaType mt) {
        if (mt == null) {
            return false;
        }
        if ("image".equalsIgnoreCase(mt.getType())) {
            return true;
        }
        if ("text".equalsIgnoreCase(mt.getType())) {
            return true;
        }
        String subtype = mt.getSubtype() == null ? "" : mt.getSubtype().toLowerCase();
        return Set.of("pdf", "plain", "json", "xml", "csv").contains(subtype);
    }
}
