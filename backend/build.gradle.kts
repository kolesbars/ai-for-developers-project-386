plugins {
    kotlin("jvm") version "2.4.21"
    kotlin("plugin.serialization") version "2.4.21"
    id("io.ktor.plugin") version "3.6.1"
    id("org.jlleitschuh.gradle.ktlint") version "14.2.0"
}

group = "io.hexlet.calendar"
version = "0.1.0"

application {
    mainClass.set("io.hexlet.calendar.ApplicationKt")
}

kotlin {
    jvmToolchain(21)
}

/** Классификатор бинарников zonky под ОС и архитектуру, на которой идёт сборка. */
val postgresPlatform: String =
    run {
        val os = System.getProperty("os.name").lowercase()
        val arch = System.getProperty("os.arch").lowercase()
        val osPart =
            when {
                os.contains("mac") -> "darwin"
                os.contains("win") -> "windows"
                else -> "linux"
            }
        val archPart = if (arch == "aarch64" || arch == "arm64") "arm64v8" else "amd64"
        "$osPart-$archPart"
    }

repositories {
    mavenCentral()
}

dependencies {
    implementation(platform("io.ktor:ktor-bom:3.6.1"))
    implementation("io.ktor:ktor-server-core")
    implementation("io.ktor:ktor-server-netty")
    implementation("io.ktor:ktor-server-content-negotiation")
    implementation("io.ktor:ktor-server-call-logging")
    implementation("io.ktor:ktor-server-status-pages")
    implementation("io.ktor:ktor-serialization-kotlinx-json")
    implementation("ch.qos.logback:logback-classic:1.6.6")

    // БД: PostgreSQL через JDBC + пул, миграции Flyway.
    implementation("org.postgresql:postgresql:42.7.14")
    implementation("com.zaxxer:HikariCP:7.1.0")
    implementation("org.flywaydb:flyway-core:13.12.1")
    implementation("org.flywaydb:flyway-database-postgresql:13.12.1")

    // Embedded PostgreSQL, когда DATABASE_URL не задан (dev, тесты, e2e).
    // Бинарники тянем только под текущую платформу: каждый jar — 15–30 МБ.
    implementation("io.zonky.test:embedded-postgres:2.2.2") {
        exclude(group = "io.zonky.test.postgres")
    }
    implementation("io.zonky.test.postgres:embedded-postgres-binaries-$postgresPlatform:17.10.0")

    testImplementation("io.ktor:ktor-server-test-host")
    testImplementation(kotlin("test-junit5"))
}

ktlint {
    version.set("1.8.0")
}

ktor {
    fatJar {
        archiveFileName.set("calendar-backend.jar")
    }
}

tasks.test {
    useJUnitPlatform()
}
