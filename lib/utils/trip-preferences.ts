export const PREFERENCE_QUESTIONS = [
  {
    key: "vibe",
    question: "What sounds good on this trip?",
    options: ["Nature & outdoors", "Museums & culture", "Food & nightlife", "Shopping", "Relaxing"],
  },
  {
    key: "pace",
    question: "How do you like to move through a day?",
    options: ["Packed itinerary", "Go with the flow", "Mostly downtime"],
  },
] as const;

export type PreferenceAnswers = Record<string, string[]>;
