package be.f5.kateahead

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.CircularProgressIndicator
import androidx.core.content.FileProvider
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

// The fixed reply for a video message: the demo has no face recognition, so the request goes to a human.
private fun videoReply(transcript: String?): String {
    val understood = if (transcript.isNullOrBlank()) "(no speech recognised)" else transcript
    return "This is the text I understood: \"$understood\". I was not able to verify your identity via face recognition, so I have forwarded it to a real human for review. Apologies for the wait."
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = KbcBlue, background = Bg, surface = Color.White)) {
                Surface(Modifier.fillMaxSize(), color = Bg) { App() }
            }
        }
    }
}

@Composable
fun App() {
    val scope = rememberCoroutineScope()
    val ctx = androidx.compose.ui.platform.LocalContext.current

    var personas by remember { mutableStateOf<List<Persona>>(emptyList()) }
    var persona by remember { mutableStateOf<Persona?>(null) }
    var me by remember { mutableStateOf<Me?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var tab by remember { mutableStateOf(Tab.Overview) }
    var banner by remember { mutableStateOf(false) }
    var revealed by remember { mutableStateOf(0) }
    var typing by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var pendingConsent by remember { mutableStateOf(false) }
    var chosen by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var acted by remember { mutableStateOf<List<String>>(emptyList()) }
    var chat by remember { mutableStateOf<List<Bubble>>(emptyList()) }
    var about by remember { mutableStateOf<About?>(null) }
    var scale by remember { mutableStateOf<Scale?>(null) }
    val listState = rememberLazyListState()

    LaunchedEffect(Unit) {
        runCatching { Api.personas() }.onSuccess { personas = it }.onFailure { error = "Could not reach the server: ${it.message}" }
    }

    // A signed-in customer: the notification arrives after 4 s, then the moments reveal one by one on the Kate tab.
    LaunchedEffect(me?.customer?.id) {
        val m = me ?: return@LaunchedEffect
        if (m.customer == null) return@LaunchedEffect
        revealed = 0; banner = false; chat = emptyList(); chosen = emptyMap(); acted = emptyList(); tab = Tab.Overview
        delay(4000); banner = true
    }
    LaunchedEffect(tab, me?.customer?.id) {
        val m = me ?: return@LaunchedEffect
        if (tab != Tab.Kate || revealed >= m.moments.size) return@LaunchedEffect
        banner = false
        while (revealed < m.moments.size) {
            typing = true; delay(1100); typing = false; revealed += 1; delay(1800)
        }
    }

    fun refresh() = scope.launch { runCatching { Api.me() }.onSuccess { me = it } }

    fun addKate(text: String) { chat = chat + Bubble("kate", text) }

    fun send(text: String) {
        if (text.isBlank() || busy) return
        chat = chat + Bubble("me", text)
        busy = true; typing = true
        scope.launch {
            val history = chat.takeLast(8).map { ChatTurn(if (it.who == "me") "user" else "assistant", it.text) }
            runCatching { Api.chat(text, history) }.onSuccess { r ->
                delay(700); typing = false; addKate(r.reply)
                for (a in r.actions) when (a.type) {
                    "act" -> { val m = me?.moments?.firstOrNull { it.kind == a.kind }; if (m != null && a.option != null) { chosen = chosen + (m.kind to a.option); acted = acted + m.title } }
                    "consent" -> if (a.level != null) { runCatching { Api.setConsent(a.level) }.onSuccess { me = it } }
                }
            }.onFailure { typing = false; addKate("The demo has no live AI agent yet, and the server did not answer: ${it.message}") }
            busy = false
        }
    }

    val speech = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val text = res.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        if (!text.isNullOrBlank()) send(text)
    }
    fun listen(prompt: String) {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_PROMPT, prompt)
        runCatching { speech.launch(i) }.onFailure { addKate("Speech recognition is not available on this phone.") }
    }

    // Video: record with the system camera, then ask the user to say what they said so we have a transcript to echo back.
    var videoUri by remember { mutableStateOf<Uri?>(null) }
    val afterVideoSpeech = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val text = res.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        chat = chat + Bubble("me", "🎥 Video message sent")
        scope.launch { typing = true; delay(1200); typing = false; addKate(videoReply(text)) }
    }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.CaptureVideo()) { ok ->
        if (!ok) return@rememberLauncherForActivityResult
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_PROMPT, "Video received. Say what you asked in it, so Kate can echo the text.")
        runCatching { afterVideoSpeech.launch(i) }.onFailure {
            chat = chat + Bubble("me", "🎥 Video message sent"); addKate(videoReply(null))
        }
    }
    fun record() {
        val dir = File(ctx.cacheDir, "captures").apply { mkdirs() }
        val f = File(dir, "kate-${System.currentTimeMillis()}.mp4")
        val uri = FileProvider.getUriForFile(ctx, "be.f5.kateahead.files", f)
        videoUri = uri
        runCatching { camera.launch(uri) }.onFailure { addKate("The camera is not available on this phone.") }
    }

    val m = me
    if (m?.customer == null) {
        if (personas.isEmpty() && error == null) {
            Box(Modifier.fillMaxSize().background(Bg), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = KbcBlue) }
        } else {
            SignInScreen(personas, error) { p ->
                scope.launch {
                    runCatching { Api.signIn(p.id); Api.me() }
                        .onSuccess { persona = p; me = it; error = null }
                        .onFailure { error = "Sign-in failed: ${it.message}" }
                }
            }
        }
        return
    }

    Column(Modifier.fillMaxSize().background(Bg)) {
        when (tab) {
            Tab.Overview -> KbcHeader("Overzicht", m.customer.name, false)
            Tab.Kate -> KbcHeader("Kate Ahead", "warns you before it goes wrong", true)
            Tab.Profile -> KbcHeader("Profiel", "what the bank already knows", false)
            Tab.Privacy -> KbcHeader("Privacy", "what Kate may notice", false)
            Tab.More -> KbcHeader("Meer", "skills, harness, guardrails", false)
        }
        if (banner && tab != Tab.Kate) {
            persona?.scenario?.let { NotificationBanner(it.notify) { tab = Tab.Kate } }
        }
        Box(Modifier.weight(1f)) {
            when (tab) {
                Tab.Overview -> OverviewScreen(m, persona?.scenario, m.moments.size) { tab = Tab.Kate }
                Tab.Kate -> KateScreen(
                    name = m.customer.name.substringBefore(" "), cards = m.moments.take(revealed), typing = typing, busy = busy,
                    chosen = chosen, chat = chat, listState = listState,
                    onChoose = { mo, i -> chosen = chosen + (mo.kind to i); acted = acted + mo.title; addKate(mo.options.getOrNull(i)?.effect ?: "Done. I will keep an eye on it.") },
                    onSend = ::send, onMic = { listen("Ask Kate") }, onCamera = ::record,
                )
                Tab.Profile -> ProfileScreen(m, acted, m.moments.size) { tab = Tab.Privacy }
                Tab.Privacy -> PrivacyScreen(m, pendingConsent,
                    onLevel = { lvl -> pendingConsent = true; scope.launch { runCatching { Api.setConsent(lvl) }.onSuccess { me = it; revealed = it.moments.size }; pendingConsent = false } },
                    onToggle = { g ->
                        if (g in ALWAYS_ON) return@PrivacyScreen
                        val next = if (g in m.groups) m.groups - g else m.groups + g
                        pendingConsent = true
                        scope.launch { runCatching { Api.setGroups(next) }.onSuccess { me = it; revealed = it.moments.size }; pendingConsent = false }
                    })
                Tab.More -> {
                    LaunchedEffect(Unit) {
                        if (about == null) runCatching { Api.about() }.onSuccess { about = it }
                        if (scale == null) runCatching { Api.scale() }.onSuccess { scale = it }
                    }
                    MoreScreen(about, scale)
                }
            }
        }
        KbcNav(tab) { tab = it }
    }
}
