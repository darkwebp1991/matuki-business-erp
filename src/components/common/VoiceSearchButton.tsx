import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { globalSpeechEngine, playChimeSound, VoiceLanguage } from '../../utils/speechRecognitionService';

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  language?: VoiceLanguage;
  size?: number;
  placeholderHint?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({
  onTranscript,
  language = 'gu-IN',
  size = 15,
  placeholderHint,
  className = '',
  style = {},
  title = '🎙️ બોલીને શોધો (Speak in Gujarati / Hindi / English)'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [selectedLang, setSelectedLang] = useState<VoiceLanguage>(language);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening) {
      globalSpeechEngine.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      globalSpeechEngine.setLanguage(selectedLang);
      setInterimText('સાંભળી રહ્યું છે... બોલો');
      setIsListening(true);

      globalSpeechEngine.start(
        (transcript, isFinal) => {
          setInterimText(transcript);
          if (isFinal && transcript) {
            onTranscript(transcript);
            setIsListening(false);
            setInterimText('');
            playChimeSound('SUCCESS');
          }
        },
        () => {
          setIsListening(false);
          setInterimText('');
        },
        (err) => {
          console.warn('Voice recognition note:', err);
          setInterimText(err);
          setTimeout(() => {
            setIsListening(false);
            setInterimText('');
          }, 2500);
        }
      );
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        className={`voice-mic-btn ${className}`}
        onClick={toggleListening}
        title={title}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: isListening ? '2px solid #ef4444' : '1px solid #cbd5e1',
          background: isListening 
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          color: isListening ? '#ffffff' : '#475569',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.6)' : '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease',
          padding: 0,
          animation: isListening ? 'pulse 1.2s infinite' : 'none',
          ...style
        }}
      >
        {isListening ? (
          <Mic size={size} color="#ffffff" className="animate-pulse" />
        ) : (
          <Mic size={size} color="#2563eb" />
        )}
      </button>

      {/* Floating Live Speech Floating Tooltip Pill */}
      {isListening && (
        <div style={{
          position: 'absolute',
          bottom: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a',
          color: '#ffffff',
          padding: '4px 10px',
          borderRadius: '14px',
          fontSize: '0.74rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none',
          border: '1px solid #334155'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#ef4444',
            display: 'inline-block',
            animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
          }} />
          <span>{interimText || 'બોલો... (Speak)'}</span>
        </div>
      )}
    </div>
  );
};
