package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.Attachment;
import com.taskboard.tasks.service.AttachmentApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/tasks/{taskId}/attachments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttachmentController {

    private final AttachmentApplicationService attachmentApplicationService;

    @GetMapping
    public ResponseEntity<List<Attachment>> list(@PathVariable Long taskId, Authentication auth) {
        return attachmentApplicationService.list(taskId, auth);
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Attachment> upload(@PathVariable Long taskId,
                                             @RequestPart("file") MultipartFile file,
                                             Authentication auth,
                                             HttpServletRequest request) {
        return attachmentApplicationService.upload(taskId, file, auth, request);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long taskId, @PathVariable Long id, Authentication auth) {
        return attachmentApplicationService.download(taskId, id, auth);
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Resource> preview(@PathVariable Long taskId, @PathVariable Long id, Authentication auth) {
        return attachmentApplicationService.preview(taskId, id, auth);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long taskId, @PathVariable Long id, Authentication auth) {
        return attachmentApplicationService.delete(taskId, id, auth);
    }
}
