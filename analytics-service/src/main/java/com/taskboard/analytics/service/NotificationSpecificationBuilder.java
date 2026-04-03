package com.taskboard.analytics.service;

import com.taskboard.analytics.entity.NotificationEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class NotificationSpecificationBuilder {

    private NotificationSpecificationBuilder() {
    }

    public static Specification<NotificationEntity> forUserFilters(Long userId,
                                                                 Boolean read,
                                                                 String typeUpper,
                                                                 Instant from,
                                                                 Instant to,
                                                                 String qTrimmed) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));

            if (read != null) {
                predicates.add(cb.equal(root.get("read"), read));
            }
            if (typeUpper != null) {
                predicates.add(cb.equal(root.get("type"), typeUpper));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            if (qTrimmed != null && !qTrimmed.isBlank()) {
                String pattern = "%" + qTrimmed.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("title"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("body"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
