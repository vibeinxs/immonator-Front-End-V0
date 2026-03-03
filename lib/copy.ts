export const copy = {
  appName: "Immonator",
  appTagline: "German Real Estate Analysis",
  betaBadge: "BETA",

  nav: {
    properties: "Properties",
    portfolio: "Portfolio",
    markets: "Markets",
    strategy: "Strategy",
    feedback: "Feedback",
    signOut: "Sign Out",
  },

  landing: {
    headline: "Know exactly what a property is worth before you offer.",
    subtext:
      "Immonator analyses every German property listing using official valuation methods — in seconds.",
    ctaPrimary: "Get Early Access →",
    ctaHint: "Invite only · No credit card needed",
    featurePills: [
      "✓ Ertragswert & Sachwert",
      "✓ AI investment verdict",
      "✓ Negotiation brief",
    ],
    quoteText:
      "I saved €18,000 on my first offer because Immonator showed me the property was overpriced.",
    quoteAttrib: "Early access member, Berlin",
    finalCta: "Start analysing properties →",
  },

  login: {
    headline: "Welcome to Immonator",
    subtext: "Enter your invite code to get started.",
    codePlaceholder: "e.g. IMMO-BCDF",
    codeLabel: "Beta Access Code",
    nameLabel: "Your name (optional)",
    submitButton: "Get Started →",
    invalidCode: "Invalid code. Check your invite.",
    revokedCode: "This access code has been deactivated. Contact us for help.",
  },

  analysis: {
    analysingText: "Immonator is analysing this property...",
    deepAnalysingText: "Immonator is running a full analysis...",
    portfolioAnalysingText: "Immonator is reviewing your portfolio...",
    strategyGeneratingText: "Immonator is building your strategy...",
    aiLabel: "Immonator AI",
    aiTimestamp: "Immonator AI · Just now",
    progressSteps: [
      "Calculating valuations...",
      "Assessing investment case...",
      "Evaluating risks...",
      "Preparing recommendations...",
    ],
    deepAnalysisButton: "Run Full Analysis",
    deepAnalysisHint: "Takes 10-20 seconds · Saved for 24 hours",
  },

  toasts: {
    saved: "Saved. Immonator is analysing...",
    analysisReady: (verdict: string) => `Analysis ready — ${verdict}`,
    firstSave: "Nice. Check back in ~15 seconds for your verdict.",
    error: "Something went wrong. Please try again.",
  },

  errors: {
    network: "Connection error. Check your internet and try again.",
    unauthorized: "Your session has expired. Please log in again.",
    generic: "Something went wrong. Please try again.",
    invalidCode: "Invalid code. Check your invite.",
    revokedCode: "This access code has been deactivated.",
  },
} as const;
