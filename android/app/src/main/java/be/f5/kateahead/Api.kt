package be.f5.kateahead

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

// The phone app's only link to the outside: the server on Vercel (the engine and the emulated agent).
// The session cookie the server sets on sign-in is kept in memory and sent back on every call.
object Api {
    class ApiException(val code: Int, val body: String) : Exception("HTTP $code: ${body.take(120)}")

    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val base = BuildConfig.API_BASE.trimEnd('/')

    private val cookies = object : CookieJar {
        private val store = mutableMapOf<String, MutableMap<String, Cookie>>()
        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            val jar = store.getOrPut(url.host) { mutableMapOf() }
            for (c in cookies) jar[c.name] = c
        }
        override fun loadForRequest(url: HttpUrl): List<Cookie> = store[url.host]?.values?.toList() ?: emptyList()
    }

    private val client = OkHttpClient.Builder()
        .cookieJar(cookies)
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(40, TimeUnit.SECONDS)
        .build()

    private suspend fun call(method: String, path: String, body: String? = null): String = withContext(Dispatchers.IO) {
        val builder = Request.Builder().url(base + path)
        if (method == "GET") builder.get() else builder.method(method, (body ?: "{}").toRequestBody(jsonType))
        client.newCall(builder.build()).execute().use { r ->
            val text = r.body?.string() ?: ""
            if (!r.isSuccessful) throw ApiException(r.code, text)
            text
        }
    }

    suspend fun personas(): List<Persona> = json.decodeFromString<PersonasResponse>(call("GET", "/api/personas")).personas
    suspend fun signIn(persona: String) { call("POST", "/api/session", json.encodeToString(SessionRequest(persona))) }
    suspend fun signOut() { runCatching { call("DELETE", "/api/session") } }
    suspend fun me(): Me = json.decodeFromString(call("GET", "/api/me"))
    suspend fun setConsent(level: Int): Me { call("PATCH", "/api/me", json.encodeToString(ConsentRequest(level))); return me() }
    suspend fun setGroups(groups: List<String>): Me { call("PATCH", "/api/me", json.encodeToString(GroupsRequest(groups))); return me() }
    suspend fun chat(text: String, history: List<ChatTurn>): ChatResult =
        json.decodeFromString(call("POST", "/api/chat", json.encodeToString(ChatRequest(text, history))))
    suspend fun about(): About = json.decodeFromString(call("GET", "/api/about"))
    suspend fun scale(): Scale = json.decodeFromString(call("GET", "/api/scale"))
}
