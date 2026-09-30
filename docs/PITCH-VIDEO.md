# Kate Ahead: the 3-minute video

Spoken script ≈ 280 words (about 2:30 at a calm pace, leaving 30 s for taps). Say only the **bold** lines. Everything else is stage direction. If you run long, drop the lines marked *(optional)*.

---

**0:00 · landing screen**

**KBC already holds the data to see most customer problems coming; today it only runs operations. Kate Ahead uses it for the customer**

**0:25 · tap Lien & Tom**

**"Lien and Tom just signed for a €385,000 house, energy label E. The bank knows the notary deposit, its own mortgage quote, its own insurance prices, and three public rules."**

*(notification arrives, tap it)*

**"The bundled insurance discount saves €7,269 in interest. The insurance costs €170 a year more, but only until year nine, when the law lets them switch and keep the discount. Net: €5,739. And the renovation the label forces costs €13,000 less on an energy loan than on the mortgage."**

*(tap Why?)* **"Every warning shows the data points it used."** *(tap the option, let the confirmation show)*

**1:20 · tap afmelden, tap Nadia**

**"Nadia is self-employed. Her client pays late; VAT is due on the 20th. The bank knows her balance, her recurring payments, and when her invoices usually land."**

*(notification, tap)* **"Balance minus each payment on its day: on the 20th she's €2,960 under, until the invoice lands on the 24th. Seen ten days early; the fix is her own savings, not an overdraft."** *(tap the option)*

**"She also paid a car dealer and the vehicle registry, and has no motor policy: a cover gap."**

**2:00 · tap Privacy**

**"Each data group is a switch. Turn one off and it says what it can no longer catch. Identity and security stay on: the law puts them there."** *(toggle B off and back on)*

**2:20 · tap Kate, type "why?", then "ok"** *(optional)*

**"No live AI in this demo: fixed intents, checked against the data, templated answers. The goal is a real agent on top, calibrated with market and actuarial research, reasoning only over verified data points."**

**2:40 · tap Meer, scroll to At scale**

**""**Same


** with kate ahead, the customer is always in control and you use intelligenceto provide them a better banking expierence based on behaviour and intent. 

and ofcourse nadia can choose to talk or write, we can handle both. 

---

## Not spoken: for the Builderbase description and Q&A

| | Lien & Tom | Nadia |
|---|---|---|
| KBC already knows | Notary deposit (B); its quote 3.45% / 3.30%, 25 y (C); bundled premium €640 vs €470 (D); duty, switch right, renovation obligation (H) | Balance €1,900, recurring debits by payee and day, invoice pattern (B); no motor policy (D); car-dealer and registry payments (B) |
| Arithmetic | Loan = 385k × 1.035 − 95k = €303,475 (79% LTV). Annuity 3.30% vs 3.45%: €7,269 saved; insurance +€170/y × 9 y = €1,530; net €5,739. Renovation €38k: €17.9k interest on the mortgage vs €4.9k on an energy loan. Rebuild value 0.62 × price = €238,700 | 1,900 → 750 (rent) → 330 (childcare) → −2,960 on the 20th (VAT + social) → 1,840 on the 24th (invoice) |
| Determination | Take the bundle, review in year 9; energy loan; insure €238,700 | Two-week buffer from savings; motor cover before the first drive |
| Lead time | 45 days | 10 days |

- *What's new? KBC has data science.* KBC uses this data for operations, compliance and offers. We compute, per customer, what is about to go wrong and the cheapest fix, show the evidence, and let the customer switch groups off. The novelty is the use, the transparency and the consent.
- *Why no live AI?* So nothing can be hallucinated on stage. The end state is an agent harnessed on this layer: thresholds calibrated on KBC's real data, the agent answering and deducing only over verified data points, citing them, acting through the same options. Meer lists the skills and guardrails it would have.
- *Only for app users?* No: the same determination goes to an adviser screen or a phone script (Jos in the app).
- *ROI?* Insurance first (retained premium at retirement, underinsurance fixed before a claim), then fraud refunds not paid. Figures in DATA-AND-INFERENCE.
