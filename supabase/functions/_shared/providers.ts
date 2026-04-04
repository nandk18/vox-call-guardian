export const getProviderConfig = (
  language: string,
  voice: string
) => {
  const voiceId =
    voice?.includes('male') && !voice?.includes('female')
      ? 'echo' : 'nova'

  const langConfig: Record<string, { transcriber_lang: string; bolna_lang: string }> = {
    english: { transcriber_lang: 'en', bolna_lang: 'en' },
    hindi: { transcriber_lang: 'hi', bolna_lang: 'hi' },
    tamil: { transcriber_lang: 'ta', bolna_lang: 'ta' },
    telugu: { transcriber_lang: 'te', bolna_lang: 'te' },
    kannada: { transcriber_lang: 'kn', bolna_lang: 'kn' },
    malayalam: { transcriber_lang: 'ml', bolna_lang: 'ml' },
    marathi: { transcriber_lang: 'mr', bolna_lang: 'mr' },
    bengali: { transcriber_lang: 'bn', bolna_lang: 'bn' },
    gujarati: { transcriber_lang: 'gu', bolna_lang: 'gu' },
    punjabi: { transcriber_lang: 'pa', bolna_lang: 'pa' },
    odia: { transcriber_lang: 'or', bolna_lang: 'or' },
  }

  const lang = langConfig[language] || langConfig['english']

  const indianLanguages = [
    'hindi', 'tamil', 'telugu', 'kannada',
    'malayalam', 'marathi', 'bengali',
    'gujarati', 'punjabi', 'odia'
  ]

  const isIndian = indianLanguages.includes(language)

  // Use Deepgram with "multi" for Indian languages (Sarvam fallback)
  const transcriber = isIndian
    ? {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'multi',
        stream: true,
      }
    : {
        provider: 'deepgram',
        model: 'nova-2',
        language: lang.transcriber_lang,
        stream: true,
      }

  const synthesizer = {
    provider: 'openai',
    provider_config: {
      voice: voiceId,
      model: 'tts-1',
    },
    stream: true,
    buffer_size: 100,
  }

  return {
    transcriber,
    synthesizer,
    langCode: lang.bolna_lang,
  }
}
