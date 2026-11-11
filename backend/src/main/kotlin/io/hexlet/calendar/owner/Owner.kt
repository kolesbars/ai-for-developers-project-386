package io.hexlet.calendar.owner

import kotlinx.serialization.Serializable

const val DEFAULT_OWNER_NAME = "Владелец календаря"
const val DEFAULT_OWNER_BIO = "Выберите удобное время для звонка."
const val DEFAULT_OWNER_TIME_ZONE = "Asia/Almaty"

/** Профиль Владельца; соответствует схеме `Owner` в api/openapi/openapi.yaml. */
@Serializable
data class Owner(
    val name: String,
    val bio: String,
    val timeZone: String,
) {
    companion object {
        /**
         * Профиль из `OWNER_NAME`, `OWNER_BIO`, `OWNER_TIME_ZONE`; пустые и незаданные — значения по умолчанию.
         */
        fun fromEnvironment(env: (String) -> String? = System::getenv): Owner {
            fun read(key: String) = env(key)?.trim()?.takeIf { it.isNotEmpty() }
            return Owner(
                name = read("OWNER_NAME") ?: DEFAULT_OWNER_NAME,
                bio = read("OWNER_BIO") ?: DEFAULT_OWNER_BIO,
                timeZone = read("OWNER_TIME_ZONE") ?: DEFAULT_OWNER_TIME_ZONE,
            )
        }
    }
}
