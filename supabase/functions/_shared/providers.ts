export const getProviderConfig = (
  language: string,
  voice: string
) => {
  const voiceStr = (voice || '').toLowerCase()
  const isMale = voiceStr.includes('male')
    && !voiceStr.includes('female')

  const synthesizer = {
    stream: true,
    caching: true,
    provider: 'elevenlabs',
    buffer_size: 200,
    audio_format: 'wav',
    provider_config: {
      model: 'eleven_turbo_v2_5',
      speed: 1.0,
      style: 0.0,
      voice: isMale
        ? 'Vikram'
        : 'Nila - Warm, Natural Tamil Customer Care Agent',
      voice_id: isMale
        ? '7Q6qcYvsTRgb4IVcoAdK'
        : 'V9LCAAi4tTlqe9JadbCo',
      temperature: 0.5,
      similarity_boost: 0.75
    }
  }

  const sarvamLangMap: Record<string, string> = {
    hindi: 'hi',
    tamil: 'ta',
    telugu: 'te',
    kannada: 'kn',
    malayalam: 'ml',
    marathi: 'mr',
    bengali: 'bn',
    gujarati: 'gu',
    punjabi: 'pa',
    odia: 'or'
  }

  const indianLanguages = Object.keys(sarvamLangMap)
  const isIndian = indianLanguages.includes(language)

  const transcriber = isIndian
    ? {
        provider: 'sarvam',
        model: 'saaras:v3',
        language: sarvamLangMap[language],
        stream: true,
        encoding: 'linear16',
        sampling_rate: 16000,
        endpointing: 100,
        task: 'transcribe'
      }
    : {
        provider: 'deepgram',
        model: 'nova-3',
        language: 'en',
        stream: true,
        encoding: 'linear16',
        sampling_rate: 16000,
        endpointing: 100
      }

  return { transcriber, synthesizer }
}
