package be.f5.kateahead

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.NumberFormat
import java.util.Locale

// ---------- Design tokens: the KBC Mobile look ----------

val KbcBlue = Color(0xFF0091D2)
val KbcBlueDark = Color(0xFF005F8F)
val KbcBlueLight = Color(0xFFE3F3FB)
val Bg = Color(0xFFEEF3F6)
val Ink = Color(0xFF0F172A)
val Muted = Color(0xFF64748B)
val Line = Color(0xFFE2E8F0)
val Rose = Color(0xFFF43F5E)
val Amber = Color(0xFFF59E0B)
val Sky = Color(0xFF0EA5E9)
val Emerald = Color(0xFF059669)
val Violet = Color(0xFF7C3AED)

fun eur(n: Double): String = "€ " + NumberFormat.getIntegerInstance(Locale("nl", "BE")).format(Math.round(n))
fun eurEn(n: Double): String = "€" + NumberFormat.getIntegerInstance(Locale.UK).format(Math.round(n))
fun lead(days: Int, realtime: Boolean): String = when {
    realtime -> "real time"; days == 0 -> "now"; days > 365 -> "${Math.round(days / 365.0)} years"; else -> "$days days"
}

enum class Tab(val label: String) { Overview("Overzicht"), Kate("Kate"), Profile("Profiel"), Privacy("Privacy"), More("Meer") }

@Composable
fun KbcHeader(title: String, subtitle: String, kate: Boolean) {
    Row(
        Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(KbcBlue, Color(0xFF00A9E0)))).padding(16.dp, 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (kate) {
            KateAvatar(36.dp)
            Spacer(Modifier.width(12.dp))
        }
        Column(Modifier.weight(1f)) {
            if (kate) {
                Text("Kate", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text(subtitle, color = Color.White.copy(alpha = 0.85f), fontSize = 12.sp)
            } else {
                Text("KBC Mobile", color = Color.White.copy(alpha = 0.85f), fontSize = 12.sp)
                Text(title, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            }
        }
        Box(Modifier.background(Color.White, RoundedCornerShape(6.dp)).padding(6.dp, 2.dp)) {
            Text("KBC", color = KbcBlue, fontWeight = FontWeight.Black, fontSize = 11.sp)
        }
    }
}

@Composable
fun KateAvatar(size: androidx.compose.ui.unit.Dp) {
    Box(
        Modifier.size(size).background(Brush.linearGradient(listOf(Color(0xFF00B4E6), Color(0xFF6F3FF5))), CircleShape),
        contentAlignment = Alignment.Center,
    ) { Text("K", color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.5).sp) }
}

@Composable
fun KbcNav(tab: Tab, onTab: (Tab) -> Unit) {
    NavigationBar(containerColor = Color.White) {
        Tab.values().forEach { t ->
            val icon = when (t) {
                Tab.Overview -> Icons.Filled.Home; Tab.Kate -> Icons.Filled.MailOutline; Tab.Profile -> Icons.Filled.Person
                Tab.Privacy -> Icons.Filled.Lock; Tab.More -> Icons.Filled.Info
            }
            NavigationBarItem(
                selected = tab == t, onClick = { onTab(t) },
                icon = { Icon(icon, contentDescription = t.label) }, label = { Text(t.label, fontSize = 10.sp) },
                colors = NavigationBarItemDefaults.colors(selectedIconColor = KbcBlue, selectedTextColor = KbcBlue, indicatorColor = KbcBlueLight, unselectedIconColor = Muted, unselectedTextColor = Muted),
            )
        }
    }
}

@Composable
fun Card(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(16.dp)).padding(14.dp), content = content)
}

@Composable
fun Kicker(text: String) = Text(text.uppercase(), color = Muted, fontSize = 10.sp, letterSpacing = 1.sp)

@Composable
fun GroupChip(g: String) {
    Box(Modifier.size(20.dp).background(Line, RoundedCornerShape(4.dp)), contentAlignment = Alignment.Center) {
        Text(g, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Ink)
    }
}

// ---------- Sign-in ----------

@Composable
fun SignInScreen(personas: List<Persona>, error: String?, onPick: (Persona) -> Unit) {
    Column(Modifier.fillMaxSize().background(Bg)) {
        Column(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(KbcBlue, Color(0xFF00A9E0)))).padding(20.dp, 24.dp, 20.dp, 36.dp)) {
            Box(Modifier.background(Color.White, RoundedCornerShape(6.dp)).padding(6.dp, 2.dp)) { Text("KBC", color = KbcBlue, fontWeight = FontWeight.Black, fontSize = 11.sp) }
            Spacer(Modifier.height(16.dp))
            Text("Wie ben je?", color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
            Text("This is a concept demo of Kate Ahead. Pick a customer to see their day.", color = Color.White.copy(alpha = 0.85f), fontSize = 14.sp)
        }
        LazyColumn(Modifier.fillMaxSize().padding(16.dp, 0.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item { Spacer(Modifier.height(0.dp)) }
            items(personas) { p ->
                Row(
                    Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(16.dp)).clickable { onPick(p) }.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(40.dp).background(KbcBlueLight, CircleShape), contentAlignment = Alignment.Center) {
                        Text(p.name.take(1), color = KbcBlueDark, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("${p.name} · ${p.age}", fontWeight = FontWeight.SemiBold, color = Ink, fontSize = 14.sp)
                        Text(p.tagline, color = Muted, fontSize = 12.sp)
                    }
                    Text("›", color = Muted, fontSize = 20.sp)
                }
            }
            item {
                if (error != null) Text(error, color = Rose, fontSize = 13.sp, modifier = Modifier.padding(8.dp), textAlign = TextAlign.Center)
                Text("Invented customers, no real data, no live AI agent.", color = Muted, fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(8.dp, 12.dp, 8.dp, 24.dp))
            }
        }
    }
}

// ---------- Overzicht ----------

@Composable
fun OverviewScreen(me: Me, scenario: Scenario?, openCount: Int, onKate: () -> Unit) {
    val name = me.customer?.name ?: ""
    val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    val greeting = if (hour < 12) "Goedemorgen" else if (hour < 18) "Goedemiddag" else "Goedenavond"
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("$greeting, $name", fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = Ink, modifier = Modifier.padding(4.dp, 4.dp)) }
        if (scenario != null) item {
            Column(Modifier.fillMaxWidth().background(KbcBlueLight, RoundedCornerShape(16.dp)).border(1.dp, KbcBlue.copy(alpha = 0.3f), RoundedCornerShape(16.dp)).padding(14.dp)) {
                Text("ZONET", color = KbcBlueDark, fontSize = 10.sp, letterSpacing = 1.sp)
                Spacer(Modifier.height(4.dp))
                Text(scenario.happened, color = Ink, fontSize = 14.sp, lineHeight = 20.sp)
            }
        }
        item {
            Card {
                val tier = when (me.accounts?.tier) { "plus" -> "Plusrekening"; "basic" -> "Basisrekening"; else -> "Zichtrekening" }
                Kicker("Zichtrekening · $tier")
                Text(eur(me.accounts?.balance ?: 0.0), fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                Text("BE71 7310 •••• 4512", color = Muted, fontSize = 12.sp)
            }
        }
        item { Card { Kicker("Spaarrekening"); Text(eur(me.accounts?.savings ?: 0.0), fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = Ink) } }
        item {
            Row(Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(16.dp)).clickable { onKate() }.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                KateAvatar(40.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Kate Ahead", fontWeight = FontWeight.SemiBold, color = Ink, fontSize = 14.sp)
                    Text(if (openCount > 0) "$openCount heads-up${if (openCount == 1) "" else "s"} voor je" else "Warns you before things go wrong", color = Muted, fontSize = 12.sp)
                }
                Text("›", color = Muted, fontSize = 20.sp)
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Overschrijven", "Kaarten", "Verzekeren", "Beleggen").forEach { t ->
                    Column(Modifier.weight(1f).background(Color.White, RoundedCornerShape(12.dp)).padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(Modifier.size(24.dp).background(KbcBlueLight, CircleShape))
                        Spacer(Modifier.height(4.dp))
                        Text(t, fontSize = 10.sp, color = Muted, maxLines = 1)
                    }
                }
            }
        }
    }
}

// ---------- Kate ----------

data class Bubble(val who: String, val text: String) // "kate" | "me" | "system"

@Composable
fun KateScreen(
    name: String, cards: List<Moment>, typing: Boolean, busy: Boolean, chosen: Map<String, Int>, chat: List<Bubble>,
    listState: LazyListState, onChoose: (Moment, Int) -> Unit, onSend: (String) -> Unit, onMic: () -> Unit, onCamera: () -> Unit,
) {
    Column(Modifier.fillMaxSize().background(Bg)) {
        LazyColumn(Modifier.weight(1f).padding(12.dp), state = listState, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item { KateBubble("Hi $name. Before this becomes a problem:") }
            items(cards, key = { it.id }) { m -> MomentCard(m, chosen[m.kind]) { i -> onChoose(m, i) } }
            if (typing) item { KateBubble("Kate is typing…") }
            items(chat) { b ->
                when (b.who) {
                    "me" -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        Text(b.text, color = Color.White, fontSize = 14.sp, modifier = Modifier.background(KbcBlue, RoundedCornerShape(16.dp, 4.dp, 16.dp, 16.dp)).padding(12.dp, 8.dp))
                    }
                    "kate" -> KateBubble(b.text)
                    else -> Text(b.text, color = Muted, fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                }
            }
            if (busy) item { KateBubble("Kate is thinking…") }
            item { Spacer(Modifier.height(4.dp)) }
        }
        Composer(busy, onSend, onMic, onCamera)
    }
}

@Composable
fun KateBubble(text: String) {
    Row(Modifier.fillMaxWidth()) {
        Text(text, color = Ink, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.fillMaxWidth(0.88f).background(Color.White, RoundedCornerShape(4.dp, 16.dp, 16.dp, 16.dp)).padding(12.dp, 8.dp))
    }
}

@Composable
fun MomentCard(m: Moment, chosen: Int?, onChoose: (Int) -> Unit) {
    var open by remember(m.id) { mutableStateOf(false) }
    val stripe = when (m.severity) { 3 -> Rose; 2 -> Amber; else -> Sky }
    Row(Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(16.dp))) {
        Box(Modifier.width(6.dp).height(IntrinsicHeight).background(stripe, RoundedCornerShape(16.dp, 0.dp, 0.dp, 16.dp)))
        Column(Modifier.weight(1f).padding(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                if (m.realtime) Tag("right now", Rose) else if (m.horizonDays > 0) Tag("${lead(m.horizonDays, false)} ahead", Muted)
                if (m.needsHuman) Tag("adviser confirms", Violet)
                if (m.channelHint != "app") Tag("also by ${m.channelHint}", Emerald)
            }
            Spacer(Modifier.height(6.dp))
            Text(m.title, fontWeight = FontWeight.SemiBold, color = Ink, fontSize = 14.sp)
            Spacer(Modifier.height(4.dp))
            Text(m.message.ifBlank { m.summary }, color = Color(0xFF334155), fontSize = 13.sp, lineHeight = 19.sp)
            Text(
                if (open) "Hide" else "Why? · based on ${m.evidence.size} data point${if (m.evidence.size == 1) "" else "s"}",
                color = KbcBlue, fontSize = 12.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(0.dp, 8.dp, 0.dp, 0.dp).clickable { open = !open },
            )
            if (open) Column(Modifier.fillMaxWidth().padding(0.dp, 6.dp, 0.dp, 0.dp).background(Bg, RoundedCornerShape(8.dp)).padding(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                m.evidence.forEach { e ->
                    Row(verticalAlignment = Alignment.Top) {
                        GroupChip(e.group); Spacer(Modifier.width(8.dp))
                        Text(buildString { append(e.field); append(": "); append(e.value) }, fontSize = 12.sp, color = Color(0xFF334155))
                    }
                }
                val money = buildString {
                    m.harmEUR?.let { if (it > 0) append("Prevents about ${eurEn(it)}. ") }
                    m.valueEUR?.let { if (it > 0) append("Worth about ${eurEn(it)}/yr.") }
                }
                if (money.isNotBlank()) Text(money, fontSize = 12.sp, color = Muted)
            }
            Spacer(Modifier.height(8.dp))
            m.options.forEachIndexed { i, o ->
                if (chosen == null) {
                    OutlinedButton(onClick = { onChoose(i) }, modifier = Modifier.fillMaxWidth().padding(0.dp, 2.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = KbcBlueDark)) {
                        Text(o.label + (o.effect?.let { " · $it" } ?: ""), fontSize = 12.sp, textAlign = TextAlign.Start, modifier = Modifier.fillMaxWidth())
                    }
                } else if (i == chosen) {
                    Text("✓ " + o.label + (o.effect?.let { " · $it" } ?: ""), color = Emerald, fontSize = 12.sp, modifier = Modifier.fillMaxWidth().background(Color(0xFFECFDF5), RoundedCornerShape(10.dp)).border(1.dp, Emerald, RoundedCornerShape(10.dp)).padding(12.dp, 8.dp))
                }
            }
            if (chosen != null) Text(if (m.needsHuman) "Your adviser confirms this before it's final." else "Kate takes it from here and confirms when it's done.", color = Muted, fontSize = 11.sp, modifier = Modifier.padding(0.dp, 4.dp))
        }
    }
}

private val IntrinsicHeight = 1000.dp

@Composable
fun Tag(text: String, color: Color) {
    Text(text.uppercase(), color = color, fontSize = 9.sp, letterSpacing = 0.5.sp, modifier = Modifier.background(color.copy(alpha = 0.12f), RoundedCornerShape(4.dp)).padding(5.dp, 2.dp))
}

@Composable
fun Composer(busy: Boolean, onSend: (String) -> Unit, onMic: () -> Unit, onCamera: () -> Unit) {
    var text by remember { mutableStateOf("") }
    Row(Modifier.fillMaxWidth().background(Color.White).padding(8.dp, 6.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onCamera) { Text("📷", fontSize = 18.sp) }
        TextField(
            value = text, onValueChange = { text = it }, placeholder = { Text("Ask Kate anything", fontSize = 14.sp) }, singleLine = true,
            modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp),
            colors = TextFieldDefaults.colors(focusedContainerColor = Bg, unfocusedContainerColor = Bg, focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent),
        )
        IconButton(onClick = onMic) { Text("🎤", fontSize = 18.sp) }
        IconButton(onClick = { if (text.isNotBlank() && !busy) { onSend(text.trim()); text = "" } }, enabled = text.isNotBlank() && !busy) {
            Icon(Icons.Filled.Send, contentDescription = "Send", tint = if (text.isNotBlank()) KbcBlue else Muted)
        }
    }
}

// ---------- Profiel ----------

@Composable
fun ProfileScreen(me: Me, acted: List<String>, openCount: Int, onDial: () -> Unit) {
    val p = me.profile ?: return
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Card {
                Kicker("Your profile, as Kate sees it")
                Text(p.headline, fontWeight = FontWeight.SemiBold, color = Ink, fontSize = 14.sp, modifier = Modifier.padding(0.dp, 4.dp))
                Row { Text("${p.unlockedGroups} of 8 data groups unlocked · dial: ${me.consentLabel}. ", color = Muted, fontSize = 12.sp); Text("Change", color = KbcBlue, fontSize = 12.sp, modifier = Modifier.clickable { onDial() }) }
                Row(Modifier.fillMaxWidth().padding(0.dp, 8.dp, 0.dp, 0.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Stat("$openCount", "open heads-ups", Modifier.weight(1f)); Stat("${acted.size}", "handled", Modifier.weight(1f))
                }
            }
        }
        if (acted.isNotEmpty()) item { Card { Kicker("Handled ahead of time"); acted.forEach { Text("✓ $it", color = Emerald, fontSize = 12.sp, modifier = Modifier.padding(0.dp, 2.dp)) } } }
        items(p.groups) { g ->
            var open by remember(g.group) { mutableStateOf(g.unlocked && g.facts.size <= 3) }
            Column(Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(16.dp)).clickable { open = !open }.padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    GroupChip(g.group); Spacer(Modifier.width(8.dp))
                    Text(g.name, fontWeight = FontWeight.Medium, color = if (g.unlocked) Ink else Muted, fontSize = 14.sp, modifier = Modifier.weight(1f))
                    Text(if (g.unlocked) "${g.facts.size} FACTS" else "LOCKED BY YOUR DIAL", color = Muted, fontSize = 9.sp, letterSpacing = 0.5.sp)
                }
                if (open) {
                    Spacer(Modifier.height(6.dp))
                    if (g.unlocked) g.facts.forEach { Text("· $it", color = Color(0xFF334155), fontSize = 12.sp, modifier = Modifier.padding(0.dp, 1.dp)) }
                    else Text("The bank holds this data, but Kate doesn't use it for heads-ups at your current dial level.", color = Muted, fontSize = 12.sp)
                }
            }
        }
        item { Text("Every fact here is something the bank already stores to run your accounts and policies. Kate Ahead doesn't collect anything new; it reads what's there, for you, with your say-so.", color = Muted, fontSize = 11.sp, modifier = Modifier.padding(4.dp, 4.dp, 4.dp, 24.dp)) }
    }
}

@Composable
fun Stat(value: String, label: String, modifier: Modifier) {
    Column(modifier.background(Bg, RoundedCornerShape(10.dp)).padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Ink); Text(label, color = Muted, fontSize = 11.sp)
    }
}

// ---------- Privacy ----------

@Composable
fun PrivacyScreen(me: Me, pending: Boolean, onLevel: (Int) -> Unit, onToggle: (String) -> Unit) {
    val allowed = me.groups.toSet()
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Text("What may Kate notice?", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Ink)
            Text("Pick a preset, or switch data groups one by one. Identity and security stay on: the bank has to act on an expiring ID and on fraud.", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(0.dp, 4.dp))
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                CONSENT_LABELS.forEachIndexed { l, label ->
                    val selected = me.consentLabel == label
                    Text("$l. $label", fontSize = 13.sp, color = if (selected) KbcBlueDark else Ink, fontWeight = FontWeight.Medium,
                        modifier = Modifier.fillMaxWidth().background(if (selected) KbcBlueLight else Color.White, RoundedCornerShape(10.dp)).border(1.dp, if (selected) KbcBlue else Line, RoundedCornerShape(10.dp)).clickable(enabled = !pending) { onLevel(l) }.padding(10.dp, 8.dp))
                }
            }
        }
        items(ALL_GROUPS) { g ->
            Row(Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(12.dp)).padding(10.dp, 6.dp), verticalAlignment = Alignment.CenterVertically) {
                GroupChip(g); Spacer(Modifier.width(8.dp))
                Text(GROUP_NAMES[g] ?: g, fontSize = 14.sp, color = Ink, modifier = Modifier.weight(1f))
                Switch(checked = g in allowed, onCheckedChange = { onToggle(g) }, enabled = g !in ALWAYS_ON && !pending, colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = KbcBlue))
            }
        }
        item {
            Card {
                Text("With this setting, Kate won't notice:", fontWeight = FontWeight.Medium, color = Ink, fontSize = 13.sp)
                if (me.hiddenByConsent.isEmpty()) Text("Nothing. Everything Kate found is shown.", color = Muted, fontSize = 12.sp)
                else me.hiddenByConsent.forEach { h -> Text("• ${h.title} (needs ${h.missingGroups.joinToString(", ")})", color = Color(0xFF334155), fontSize = 12.sp, modifier = Modifier.padding(0.dp, 2.dp)) }
            }
        }
        item { Spacer(Modifier.height(16.dp)) }
    }
}

// ---------- Meer ----------

@Composable
fun MoreScreen(about: About?, scale: Scale?) {
    LazyColumn(Modifier.fillMaxSize().background(Bg).padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Card {
                Kicker("About this demo")
                Text("Kate Ahead warns you before something goes wrong, on data the bank already holds, and explains why. This is a concept: five invented customers, no real data, and no live AI agent. Every warning is computed by the rules below, and every reply is a template over verified facts. The phone app is native Android; the engine and the emulated agent run on the server.", color = Ink, fontSize = 13.sp, lineHeight = 19.sp, modifier = Modifier.padding(0.dp, 4.dp))
            }
        }
        item {
            Card {
                Kicker("The eight data groups")
                ALL_GROUPS.forEach { g ->
                    Row(Modifier.padding(0.dp, 2.dp), verticalAlignment = Alignment.CenterVertically) {
                        GroupChip(g); Spacer(Modifier.width(8.dp))
                        Text((GROUP_NAMES[g] ?: g) + if (g in ALWAYS_ON) " · always on (legal duty)" else "", fontSize = 12.sp, color = Ink)
                    }
                }
                Text("Nothing new is collected. Each group can be switched off on the Privacy tab, except A and G.", color = Muted, fontSize = 11.sp, modifier = Modifier.padding(0.dp, 6.dp, 0.dp, 0.dp))
            }
        }
        if (about == null) item { Card { Text("Loading how it works…", color = Muted, fontSize = 12.sp) } }
        else {
            item { Card { Kicker("The skills (watchers)") } }
            items(about.skills) { s ->
                var open by remember(s.name) { mutableStateOf(false) }
                Column(Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(12.dp)).clickable { open = !open }.padding(10.dp)) {
                    Text("${s.name}  ·  tier ${s.tier} · ${s.leadTime}", fontWeight = FontWeight.Medium, color = Ink, fontSize = 13.sp)
                    if (open) {
                        Text(s.fires, color = Color(0xFF334155), fontSize = 12.sp, modifier = Modifier.padding(0.dp, 4.dp))
                        s.dataPoints.forEach { d -> Row(verticalAlignment = Alignment.Top, modifier = Modifier.padding(0.dp, 1.dp)) { GroupChip(d.group); Spacer(Modifier.width(8.dp)); Text(d.field, fontSize = 12.sp, color = Ink) } }
                        Text("Moments: " + s.moments.joinToString(" · "), color = Muted, fontSize = 11.sp, modifier = Modifier.padding(0.dp, 4.dp, 0.dp, 0.dp))
                    }
                }
            }
            item { Card { Kicker("The harness"); about.harness.forEach { h -> Text(buildString { append(h.step); append(". "); append(h.what) }, fontSize = 12.sp, color = Ink, modifier = Modifier.padding(0.dp, 2.dp)) } } }
            item { Card { Kicker("Guardrails"); about.guardrails.forEach { g -> Text("• $g", fontSize = 12.sp, color = Ink, modifier = Modifier.padding(0.dp, 2.dp)) } } }
        }
        item {
            Card {
                Kicker("At scale")
                if (scale == null) Text("Running the skills over 50,000 synthetic customers…", color = Muted, fontSize = 12.sp)
                else {
                    val harm = scale.rows.sumOf { it.harmEUR }; val value = scale.rows.sumOf { it.valueEUR }
                    Text("The same skills ran over ${NumberFormat.getIntegerInstance(Locale.UK).format(scale.population)} synthetic customers (seeded, no real data). ${Math.round(100.0 * scale.customersWithMoment / scale.population)}% have a moment today. Expected harm prevented if every warning lands: ${eurEn(harm)} a year; value found: ${eurEn(value)} a year.", fontSize = 12.sp, color = Ink, lineHeight = 18.sp)
                    Spacer(Modifier.height(6.dp))
                    scale.rows.take(12).forEach { r ->
                        Row(Modifier.fillMaxWidth().padding(0.dp, 2.dp)) {
                            Text(r.kind.replace('-', ' '), fontSize = 11.sp, color = Ink, modifier = Modifier.weight(1f))
                            Text(NumberFormat.getIntegerInstance(Locale.UK).format(r.count), fontSize = 11.sp, color = Ink)
                            Spacer(Modifier.width(10.dp))
                            Text(if (r.avgHorizonDays == 0) "now" else if (r.avgHorizonDays > 365) "${Math.round(r.avgHorizonDays / 365.0)} y" else "${r.avgHorizonDays} d", fontSize = 11.sp, color = Muted, modifier = Modifier.width(40.dp), textAlign = TextAlign.End)
                        }
                    }
                }
            }
        }
        item { Text("Team F5 · Tectonic Hackathon 2026 · KBC challenge · github.com/WhiteChair/f5-builderbase", color = Muted, fontSize = 11.sp, modifier = Modifier.padding(4.dp, 4.dp, 4.dp, 24.dp)) }
    }
}

// ---------- Notification banner ----------

@Composable
fun NotificationBanner(notify: Notify, onTap: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().padding(12.dp, 8.dp).background(Color.White, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).clickable { onTap() }.padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) { KateAvatar(20.dp); Spacer(Modifier.width(8.dp)); Text("Kate Ahead · now", color = Muted, fontSize = 11.sp) }
        Text(notify.title, fontWeight = FontWeight.SemiBold, color = Ink, fontSize = 14.sp, modifier = Modifier.padding(0.dp, 4.dp, 0.dp, 0.dp))
        Text(notify.body, color = Color(0xFF334155), fontSize = 12.sp)
    }
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit) {
    Button(onClick = onClick, colors = ButtonDefaults.buttonColors(containerColor = KbcBlue), shape = RoundedCornerShape(12.dp)) { Text(text) }
}
