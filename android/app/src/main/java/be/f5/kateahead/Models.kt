package be.f5.kateahead

import kotlinx.serialization.Serializable

// Wire types of the server API (server/app/api/*). Unknown fields are ignored.

@Serializable data class Notify(val title: String, val body: String)
@Serializable data class Scenario(val happened: String, val notify: Notify)
@Serializable data class Persona(
    val id: String, val name: String, val age: Int, val tagline: String,
    val story: String = "", val showcases: List<String> = emptyList(), val scenario: Scenario? = null,
)
@Serializable data class PersonasResponse(val personas: List<Persona>)

@Serializable data class Customer(val id: String, val name: String, val age: Int, val channel: String, val digitalConfidence: String)
@Serializable data class Accounts(val balance: Double, val savings: Double, val tier: String)
@Serializable data class ProfileGroup(val group: String, val name: String, val unlocked: Boolean, val facts: List<String>)
@Serializable data class Profile(val headline: String, val groups: List<ProfileGroup>, val unlockedGroups: Int, val totalFacts: Int)
@Serializable data class Evidence(val group: String, val field: String, val value: String)
@Serializable data class Option(val label: String, val effect: String? = null)
@Serializable data class Moment(
    val id: String, val family: String, val kind: String, val title: String, val summary: String,
    val severity: Int, val horizonDays: Int, val harmEUR: Double? = null, val valueEUR: Double? = null,
    val evidence: List<Evidence>, val options: List<Option>, val requiredConsent: Int,
    val realtime: Boolean = false, val needsHuman: Boolean = false, val message: String = "", val channelHint: String = "app",
)
@Serializable data class Hidden(val id: String, val kind: String, val title: String, val requiredConsent: Int, val missingGroups: List<String> = emptyList())
@Serializable data class Me(
    val signedIn: Boolean, val customer: Customer? = null, val accounts: Accounts? = null,
    val consent: Int = 3, val consentLabel: String = "", val groups: List<String> = emptyList(),
    val profile: Profile? = null, val moments: List<Moment> = emptyList(),
    val hiddenByConsent: List<Hidden> = emptyList(), val overflow: Int = 0,
)

@Serializable data class ChatTurn(val role: String, val content: String)
@Serializable data class ChatRequest(val text: String, val history: List<ChatTurn>)
@Serializable data class ChatAction(val type: String, val kind: String? = null, val option: Int? = null, val label: String? = null, val level: Int? = null, val topic: String? = null)
@Serializable data class ChatResult(val reply: String, val actions: List<ChatAction> = emptyList(), val intent: String = "")

@Serializable data class DataPoint(val group: String, val field: String)
@Serializable data class Skill(val name: String, val tier: Int, val fires: String, val dataPoints: List<DataPoint>, val leadTime: String, val moments: List<String>)
@Serializable data class HarnessStep(val step: String, val what: String)
@Serializable data class About(val skills: List<Skill>, val harness: List<HarnessStep>, val guardrails: List<String>)
@Serializable data class ScaleRow(val kind: String, val family: String, val count: Int, val avgHorizonDays: Int, val harmEUR: Double, val valueEUR: Double, val hiddenByConsent: Int)
@Serializable data class Scale(val population: Int, val customersWithMoment: Int, val totalMoments: Int, val rows: List<ScaleRow>)

@Serializable data class ConsentRequest(val consent: Int)
@Serializable data class GroupsRequest(val groups: List<String>)
@Serializable data class SessionRequest(val persona: String)

val GROUP_NAMES = mapOf(
    "A" to "Identity & compliance", "B" to "Accounts & payments", "C" to "Products & pricing", "D" to "Insurance",
    "E" to "Life stage & household", "F" to "Behaviour & channel", "G" to "Device & security", "H" to "External calendars & rules",
)
val CONSENT_LABELS = listOf("Only the essentials", "My products", "My money patterns", "How I use the app")
val ALWAYS_ON = setOf("A", "G")
val ALL_GROUPS = listOf("A", "B", "C", "D", "E", "F", "G", "H")
