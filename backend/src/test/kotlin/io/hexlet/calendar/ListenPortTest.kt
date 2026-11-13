package io.hexlet.calendar

import kotlin.test.Test
import kotlin.test.assertEquals

class ListenPortTest {
    private fun portFor(vararg env: Pair<String, String>) = listenPort { name -> env.toMap()[name] }

    @Test
    fun `PORT важнее BACKEND_PORT`() = assertEquals(10000, portFor("PORT" to "10000", "BACKEND_PORT" to "8081"))

    @Test
    fun `без PORT берётся BACKEND_PORT`() = assertEquals(8081, portFor("BACKEND_PORT" to "8081"))

    @Test
    fun `без переменных — 8080`() = assertEquals(8080, portFor())

    @Test
    fun `нечисловой PORT пропускается`() = assertEquals(8081, portFor("PORT" to "", "BACKEND_PORT" to "8081"))
}
