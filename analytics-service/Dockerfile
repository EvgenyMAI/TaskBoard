FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /build
COPY pom.xml .
COPY taskboard-common/pom.xml taskboard-common/
COPY taskboard-common/src taskboard-common/src
COPY analytics-service/pom.xml analytics-service/
COPY analytics-service/src analytics-service/src
# Same: parent reactor lists tasks-service; directory must be present for POM resolution.
COPY tasks-service/pom.xml tasks-service/
COPY tasks-service/src tasks-service/src
# Install parent (for GAV resolution) + common, then package only this service.
RUN mvn -B install -N -DskipTests \
    && mvn -B install -pl taskboard-common -DskipTests \
    && mvn -B clean package -pl analytics-service -DskipTests \
    && jar tf analytics-service/target/analytics-service.jar | grep -Fq 'BOOT-INF/classes/com/taskboard/analytics/AnalyticsServiceApplication.class' \
    && cp analytics-service/target/analytics-service.jar /build/app.jar

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/app.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
