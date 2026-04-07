export const getProviderConfig = (
  language: string,
  voice: string
) => {
  const isMale = (voice || '')
    .toLowerCase().includes('male')
    && !(voice || '')
      .toLowerCase().includes('female')
  const voiceName = isMale
    ? 'Vikram'
    : 'Nila - Warm, Natural'

  const synthesizer = {
    provider: 'elevenlabs',
    provider_config: {
      voice: voiceName,
      model: 'eleven_turbo_v2_5',
      buffer_size: 200,
      speed_rate: 1,
      similarity_boost: 0.75,
      stability: 0.5,
      style_exaggeration: 0
    },
    stream: true,
    buffer_size: 200
  }

  const sarvamLangMap: Record<string, string> = {
    hindi: 'hi-IN',
    tamil: 'ta-IN',
    telugu: 'te-IN',
    kannada: 'kn-IN',
    malayalam: 'ml-IN',
    marathi: 'mr-IN',
    bengali: 'bn-IN',
    gujarati: 'gu-IN',
    punjabi: 'pa-IN',
    odia: 'od-IN'
  }

  const indianLanguages = Object.keys(sarvamLangMap)
  const isIndian = indianLanguages.includes(language)

  const transcriber = isIndian
    ? {
        provider: 'sarvam',
        model: 'saaras:v2.5',
        language: sarvamLangMap[language],
        stream: true
      }
    : {
        provider: 'deepgram',
        model: 'nova-3',
        language: 'en',
        stream: true,
        endpointing: 100
      }

  return { transcriber, synthesizer }
}
