// Speech Recognition & Gujarati Audio Service for Matuki Business ERP
// Supports Gujarati (gu-IN), Hindi (hi-IN), and Indian English (en-IN)

export type VoiceLanguage = 'gu-IN' | 'hi-IN' | 'en-IN';

// Speech synthesis chime generator using Web Audio API
export function playChimeSound(type: 'START' | 'SUCCESS' | 'ERROR' = 'START') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'START') {
      // Pleasant rising double-pip
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'SUCCESS') {
      // Cheerful success chord
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Gentle error buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // AudioContext blocked by browser policy
  }
}

// Text-to-speech feedback (speak confirmation in Gujarati / Hindi / English)
export function speakFeedbackText(text: string, lang: VoiceLanguage = 'gu-IN') {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Cancel any ongoing utterance

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Try to find native voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis not available:', e);
  }
}

// Check if browser supports Web Speech API
export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

// Common Gujarati & Hindi Sweets / ERP Phonetic Replacements
const SWEET_PHONETIC_MAP: Record<string, string> = {
  'કાજુ કતરી': 'Kaju Katli',
  'કાજુ કતલી': 'Kaju Katli',
  'કાજુ બરફી': 'Kaju Barfi',
  'કાજુ રોલ': 'Kaju Roll',
  'ગુલાબ જાંબુ': 'Gulab Jamun',
  'ગુલાબ જામુન': 'Gulab Jamun',
  'પેંડા': 'Peda',
  'પેડા': 'Peda',
  'કેસર પેંડા': 'Kesar Peda',
  'મોહનથાળ': 'Mohanthal',
  'રસગુલ્લા': 'Rasgulla',
  'રસમલાઈ': 'Rasmalai',
  'મિલ્ક કેક': 'Milk Cake',
  'જલેબી': 'Jalebi',
  'કાજૂ': 'Kaju',
  'ઘારી': 'Ghari',
  'સુરતી ઘારી': 'Surati Ghari',
  'સેવ ખમણી': 'Sev Khamani',
  'ફરસાણ': 'Farsan',
  'ચવાણું': 'Chavanu',
  'ડ્રાયફ્રૂટ': 'Dryfruit',
  'મિલ્ટન': 'Milton',
  'ચોકી': 'Choki',
  'ડબ્બો': 'Dabba',
  'સ્ટીલ ડબ્બો': 'Steel Dabba',
  'પારસલ': 'Parcel'
};

// Normalize and clean recognized transcript
export function cleanTranscript(rawText: string): string {
  let cleaned = rawText.trim().replace(/[.,!?;:]/g, '');
  
  // Replace direct matching phrases from phonetic map if useful
  return cleaned;
}

export class SpeechRecognizerEngine {
  private recognition: any = null;
  private isListening = false;
  private lang: VoiceLanguage = 'gu-IN';
  private onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor(defaultLang: VoiceLanguage = 'gu-IN') {
    this.lang = defaultLang;
  }

  public setLanguage(newLang: VoiceLanguage) {
    this.lang = newLang;
    if (this.recognition) {
      this.recognition.lang = newLang;
    }
  }

  public getLanguage(): VoiceLanguage {
    return this.lang;
  }

  public async start(
    onResult: (transcript: string, isFinal: boolean) => void,
    onEnd?: () => void,
    onError?: (err: string) => void
  ) {
    // 1. If already listening, stop previous
    this.stop();

    if (!isSpeechRecognitionSupported()) {
      const errText = 'તમારા બ્રાઉઝરમાં વોઇસ સપોર્ટ નથી. કૃપા કરીને Google Chrome અથવા Microsoft Edge વાપરો.';
      if (onError) onError(errText);
      return;
    }

    this.onResultCallback = onResult;
    this.onEndCallback = onEnd || null;
    this.onErrorCallback = onError || null;

    // 2. Request microphone permission explicitly via getUserMedia if available
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close stream tracks immediately to free hardware for SpeechRecognition
        stream.getTracks().forEach(t => t.stop());
      } catch (micErr: any) {
        console.warn('Microphone permission request note:', micErr);
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          const errText = 'માઈક્રોફોન પરવાનગી બ્લોક કરેલ છે. બ્રાઉઝરના Address Bar માં 🔒/Settings આઇકન પર ક્લિક કરી Microphone Allow કરો.';
          if (onError) onError(errText);
          return;
        }
      }
    }

    // 3. Create a fresh SpeechRecognition instance for this session
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.lang;

      this.recognition.onstart = () => {
        this.isListening = true;
        playChimeSound('START');
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final && this.onResultCallback) {
          this.onResultCallback(cleanTranscript(final), true);
        } else if (interim && this.onResultCallback) {
          this.onResultCallback(cleanTranscript(interim), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        playChimeSound('ERROR');
        let userMsg = event.error || 'Speech recognition failed';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          userMsg = 'માઈક્રોફોન પરવાનગી બ્લોક છે અથવા HTTPS ની જરૂર છે. નીચે ટાઈપ કરીને પણ કમાન્ડ આપી શકાય છે.';
        } else if (event.error === 'no-speech') {
          userMsg = 'કોઈ અવાજ સંભળાયો નથી. ફરીથી માઈક દબાવો અને સ્પષ્ટ બોલો.';
        } else if (event.error === 'network') {
          userMsg = 'ઇન્ટરનેટ કનેક્શન તપાસો (Google Speech નેટવર્ક જરૂરી છે).';
        } else if (event.error === 'aborted') {
          userMsg = 'વોઇસ બંધ કરવામાં આવ્યો છે.';
        }
        if (this.onErrorCallback) {
          this.onErrorCallback(userMsg);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };

      this.recognition.start();
    } catch (e: any) {
      this.isListening = false;
      console.warn('Speech recognition start error:', e.message);
      if (onError) {
        onError(e.message || 'વોઇસ શરૂ થઈ શક્યો નથી.');
      }
    }
  }

  public stop() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }
    this.isListening = false;
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

// Global Singleton Instance
export const globalSpeechEngine = new SpeechRecognizerEngine('gu-IN');
