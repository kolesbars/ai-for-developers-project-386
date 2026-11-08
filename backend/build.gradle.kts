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

repositories {
    mavenCentral()
}

dependencies {
    implementation(platform("io.ktor:ktor-bom:3.6.1"))
    implementation("io.ktor:ktor-server-core")
    implementation("io.ktor:ktor-server-netty")
    implementation("io.ktor:ktor-server-content-negotiation")
    implementation("io.ktor:ktor-server-call-logging")
    implementation("io.ktor:ktor-serialization-kotlinx-json")
    implementation("ch.qos.logback:logback-classic:1.6.6")

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
