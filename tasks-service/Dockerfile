FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /build
COPY pom.xml .
COPY taskboard-common/pom.xml taskboard-common/
COPY taskboard-common/src taskboard-common/src
COPY tasks-service/pom.xml tasks-service/
COPY tasks-service/src tasks-service/src
# Root pom.xml lists analytics-service as a module; Maven requires the path to exist even when building only tasks-service.
COPY analytics-service/pom.xml analytics-service/
COPY analytics-service/src analytics-service/src
# Parent POM must be in local .m2 so dependency POMs (taskboard-common) resolve taskboard-parent by GAV.
# Copy fat jar by fixed name (see <finalName> in pom). Do not use grep on -plain.jar — BusyBox grep misparses leading '-'.
RUN mvn -B install -N -DskipTests \
    && mvn -B install -pl taskboard-common -DskipTests \
    && mvn -B clean package -pl tasks-service -DskipTests \
    && jar tf tasks-service/target/tasks-service.jar | grep -Fq 'BOOT-INF/classes/com/taskboard/tasks/TasksServiceApplication.class' \
    && cp tasks-service/target/tasks-service.jar /build/app.jar

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/app.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
