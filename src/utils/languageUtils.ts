export const getMixedLanguageInfo = (lang: string) => {
  const map: Record<string, { name: string; mixed: string | null }> = {
    hindi: { name: "Hindi", mixed: "Hinglish" },
    tamil: { name: "Tamil", mixed: "Tanglish" },
    telugu: { name: "Telugu", mixed: "Tenglish" },
    kannada: { name: "Kannada", mixed: "Kanglish" },
    malayalam: { name: "Malayalam", mixed: "Manglish" },
    marathi: { name: "Marathi", mixed: "Minglish" },
    bengali: { name: "Bengali", mixed: "Benglish" },
    gujarati: { name: "Gujarati", mixed: "Gujlish" },
    punjabi: { name: "Punjabi", mixed: "Punglish" },
    odia: { name: "Odia", mixed: "Odlish" },
    english: { name: "English", mixed: null },
  };
  return map[lang] || { name: lang, mixed: `${lang}-English mix` };
};
