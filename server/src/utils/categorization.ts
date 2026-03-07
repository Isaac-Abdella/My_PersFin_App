// Auto-categorization rules based on merchant/description patterns
const categoryRules: { [key: string]: RegExp[] } = {
  "Groceries": [
    /walmart|target|costco|safeway|kroger|publix|whole foods|trader joe|aldi|food lion/i,
    /grocery|supermarket|market/i
  ],
  "Restaurants": [
    /restaurant|cafe|coffee|starbucks|dunkin|mcdonald|burger|pizza|taco|subway|chipotle/i,
    /doordash|uber eats|grubhub|postmates/i
  ],
  "Gas & Fuel": [
    /shell|chevron|exxon|mobil|bp|arco|texaco|marathon|sunoco|valero/i,
    /gas station|fuel/i
  ],
  "Transportation": [
    /uber|lyft|taxi|transit|metro|bus fare|parking|toll/i
  ],
  "Utilities": [
    /electric|water|gas company|sewer|trash|waste management/i,
    /^pge|^sdge|^sce|utility/i
  ],
  "Internet & Phone": [
    /comcast|xfinity|verizon|at&t|t-mobile|sprint|spectrum|cox|centurylink/i,
    /internet|cable|phone service|wireless/i
  ],
  "Entertainment": [
    /netflix|hulu|disney|spotify|amazon prime|hbo|movie|theater|cinema/i,
    /gaming|playstation|xbox|steam|entertainment/i
  ],
  "Shopping": [
    /amazon|ebay|etsy|best buy|home depot|lowes|ikea|macys|nordstrom/i,
    /online shopping|retail/i
  ],
  "Healthcare": [
    /pharmacy|cvs|walgreens|rite aid|hospital|doctor|dental|medical|health/i,
    /insurance.*health|blue cross|kaiser|aetna/i
  ],
  "Insurance": [
    /insurance|geico|state farm|allstate|progressive|liberty mutual/i
  ],
  "Rent/Mortgage": [
    /rent|mortgage|property management|landlord/i
  ],
  "Education": [
    /school|university|college|tuition|course|textbook|education/i
  ],
  "Fitness": [
    /gym|fitness|yoga|peloton|planet fitness|24 hour|crunch/i
  ],
  "Personal Care": [
    /salon|barber|spa|haircut|nail|beauty/i
  ],
  "Pet Care": [
    /pet|veterinary|vet|petsmart|petco/i
  ],
  "Subscriptions": [
    /subscription|membership|monthly.*fee/i
  ],
  "Travel": [
    /hotel|airbnb|airline|flight|booking|expedia|travel/i
  ],
  "Charity": [
    /donation|charity|non-profit|foundation/i
  ],
  "ATM/Cash": [
    /atm|cash withdrawal/i
  ]
};

export function categorizeTransaction(description: string): string {
  if (!description) return "Uncategorized";

  const desc = description.toLowerCase();

  // Check each category's rules
  for (const [category, patterns] of Object.entries(categoryRules)) {
    for (const pattern of patterns) {
      if (pattern.test(desc)) {
        return category;
      }
    }
  }

  return "Uncategorized";
}

// Get suggested category based on description
export function getSuggestedCategory(description: string): string {
  return categorizeTransaction(description);
}

// Get all available categories
export function getAvailableCategories(): string[] {
  return [
    ...Object.keys(categoryRules),
    "Uncategorized",
    "Income",
    "Transfer",
    "Other"
  ].sort();
}
