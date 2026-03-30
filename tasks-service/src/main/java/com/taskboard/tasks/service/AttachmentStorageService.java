package com.taskboard.tasks.service;

import io.minio.*;
import io.minio.errors.ErrorResponseException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URLConnection;
import java.util.Locale;
import java.util.UUID;

@Service
public class AttachmentStorageService {

    private final MinioClient minioClient;
    private final String bucket;

    public AttachmentStorageService(@Value("${app.attachments.minio.endpoint:http://localhost:9000}") String endpoint,
                                    @Value("${app.attachments.minio.access-key:minioadmin}") String accessKey,
                                    @Value("${app.attachments.minio.secret-key:minioadmin}") String secretKey,
                                    @Value("${app.attachments.minio.bucket:taskboard-attachments}") String bucket) {
        this.minioClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        this.bucket = bucket;
    }

    @PostConstruct
    public void ensureBucket() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new IllegalStateException("Cannot initialize MinIO bucket: " + bucket, e);
        }
    }

    public String store(Long taskId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Attachment file is empty");
        }
        String original = sanitize(file.getOriginalFilename());
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot > 0 && dot < original.length() - 1) {
            ext = original.substring(dot).toLowerCase(Locale.ROOT);
        }
        String objectKey = "task-" + taskId + "/" + UUID.randomUUID().toString().replace("-", "") + ext;
        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = URLConnection.guessContentTypeFromName(original);
        }
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }
        try (InputStream is = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .stream(is, file.getSize(), -1)
                            .contentType(contentType)
                            .build()
            );
            return objectKey;
        } catch (Exception e) {
            throw new IllegalStateException("Cannot store attachment in MinIO", e);
        }
    }

    public byte[] read(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("Object key is empty");
        }
        try (GetObjectResponse response = minioClient.getObject(
                GetObjectArgs.builder().bucket(bucket).object(objectKey).build()
        )) {
            return response.readAllBytes();
        } catch (ErrorResponseException e) {
            if (e.errorResponse() != null && "NoSuchKey".equalsIgnoreCase(e.errorResponse().code())) {
                return null;
            }
            throw new IllegalStateException("Cannot read attachment from MinIO", e);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot read attachment from MinIO", e);
        }
    }

    public void deleteQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return;
        try {
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(objectKey).build());
        } catch (Exception ignored) {
            // no-op
        }
    }

    private static String sanitize(String fileName) {
        if (fileName == null || fileName.isBlank()) return "file";
        return fileName.replaceAll("[\\\\/:*?\"<>|\\r\\n\\t]+", "_").trim();
    }
}

