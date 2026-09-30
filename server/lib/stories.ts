// Each customer's scenario: what just happened in their life (shown on the Overzicht so the presenter can
// narrate it), and the notification that leads into Kate Ahead. The moments themselves come from the engine.

export interface Scenario {
  happened: string; // second person, shown in the "Zonet" card
  notify: { title: string; body: string };
}

export const SCENARIOS: Record<string, Scenario> = {
  lien: {
    happened: "You and Tom just signed the compromis for a €385,000 house with an energy label E. The €38,500 deposit went to the notary this morning. Your KBC mortgage quote is on the table, with a bundled insurance discount.",
    notify: { title: "Heads-up on your house purchase", body: "Three things worth knowing before the deed. Nothing is decided for you." },
  },
  marc: {
    happened: "You confirmed your retirement date with HR this afternoon: 1 March. Your group hospitalisation insurance ends the same day; nobody mentioned it. Your ID card expires next month.",
    notify: { title: "Two things before you retire", body: "Your hospitalisation cover changes in March, and your ID card expires next month." },
  },
  ayse: {
    happened: "Lisbon, Saturday. You paid the café with your other app again, because it has no card fees abroad. Your 25th birthday, and the end of your free account, is in 38 days.",
    notify: { title: "Your free account ends on your birthday", body: "Here's the cheapest setup for how you actually bank. Nothing changes unless you say so." },
  },
  jos: {
    happened: "Twelve minutes ago you tapped a link in a text about a held parcel and “re-installed” the banking app on a new phone, as instructed. You're about to send €2,850 to “PostNL Douane BV”.",
    notify: { title: "Let's pause this payment for a moment", body: "This looks like a scam we see a lot. Nothing is blocked; I'll call you on your usual number." },
  },
  nadia: {
    happened: "Your biggest client just said “I'll pay next month, promise.” VAT prepayment and social contributions land on the 20th. Last week you bought a car.",
    notify: { title: "Your account dips below zero on the 20th", body: "A two-week buffer from savings avoids overdraft costs. Also: the new car isn't insured with us yet." },
  },
};
