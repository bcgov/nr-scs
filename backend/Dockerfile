FROM maven:3.9.16-amazoncorretto-21-alpine AS build
WORKDIR /workspace/app

COPY pom.xml .
# The OpenAPI generator writes into generated/; its .openapi-generator-ignore lists classes that were
# promoted into src/main/java and must not be regenerated.
COPY generated/.openapi-generator-ignore generated/.openapi-generator-ignore
COPY src src
RUN mvn -B package -DskipTests
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

# 21.0.12 or later: earlier JDKs carry time-zone rules from before B.C. stayed on UTC−7
# (2026-11-01), so America/Vancouver would fall back to UTC−8 and every Pacific timestamp would be an
# hour behind. TZ only names the zone; the rules come from this JDK.
FROM eclipse-temurin:21.0.13.1_2-jdk-alpine-3.23

# OpenShift runs the container as a random UID with no home directory and a read-only root
# filesystem. Point HOME and caches at /tmp (an emptyDir in openshift.deploy.yml) so JasperReports'
# font lookups (fontconfig) have a writable cache directory.
ENV HOME=/tmp \
    XDG_CACHE_HOME=/tmp/.cache

RUN adduser -D -s /bin/sh spring
RUN mkdir -p /logs
RUN chown -R spring:spring /logs
RUN chmod 755 /logs
USER spring
VOLUME /tmp
ARG DEPENDENCY=/workspace/app/target/dependency
COPY --from=build ${DEPENDENCY}/BOOT-INF/lib /app/lib
COPY --from=build ${DEPENDENCY}/META-INF /app/META-INF
COPY --from=build ${DEPENDENCY}/BOOT-INF/classes /app

# OpenShift ignores HEALTHCHECK in favour of the Deployment's probes, but Trivy (DS-0026) and
# `docker run` outside K8s expect one. Liveness only: overall /actuator/health includes the database.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/actuator/health/liveness || exit 1

# Heap is a percentage of the container memory limit (openshift.deploy.yml), not a fixed -Xmx.
# HeapDumpOnOutOfMemoryError writes to /temp (an emptyDir) before ExitOnOutOfMemoryError ends the JVM.
# Timezone comes from the TZ env var on the Deployment; do not add -Duser.timezone.
ENTRYPOINT ["java","-Duser.name=SCS-API","-XX:InitialRAMPercentage=15","-XX:MaxRAMPercentage=60","-XX:TieredStopAtLevel=1","-XX:+UseParallelGC","-XX:MinHeapFreeRatio=20","-XX:MaxHeapFreeRatio=40","-XX:GCTimeRatio=4","-XX:AdaptiveSizePolicyWeight=90","-XX:MaxMetaspaceSize=200m","-XX:ParallelGCThreads=2","-Djava.util.concurrent.ForkJoinPool.common.parallelism=8","-XX:CICompilerCount=2","-XX:+HeapDumpOnOutOfMemoryError","-XX:HeapDumpPath=/temp","-XX:+ExitOnOutOfMemoryError","-Djava.security.egd=file:/dev/./urandom","-cp","app:app/lib/*","ca.bc.gov.nrs.scs.backend.ScsApiApplication"]
