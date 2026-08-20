import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Sparkles, 
  ShoppingCart, 
  Receipt, 
  Users, 
  Package, 
  BookOpen, 
  Clock, 
  Search, 
  Volume2, 
  VolumeX,
  Languages,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  globalSpeechEngine, 
  playChimeSound, 
  speakFeedbackText, 
  VoiceLanguage,
  isSpeechRecognitionSupported 
} from '../../utils/speechRecognitionService';
import { parseVoiceCommand, ParsedVoiceCommand } from '../../utils/voiceCommandService';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onOpenNewSale: () => void;
  onOpenNewPurchase: () => void;
  onOpenNewExpense: () => void;
  onOpenPaymentIn: () => void;
  onOpenPaymentOut: () => void;
  onGlobalSearch: (query: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenNewSale,
  onOpenNewPurchase,
  onOpenNewExpense,
  onOpenPaymentIn,
  onOpenPaymentOut,
  onGlobalSearch
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [language, setLanguage] = useState<VoiceLanguage>('gu-IN');
  const [isVoiceFeedbackEnabled, setIsVoiceFeedbackEnabled] = useState(true);
  const [parsedCommand, setParsedCommand] = useState<ParsedVoiceCommand | null>(null);
  const [statusMessage, setStatusMessage] = useState('માઈક્રોફોન પર ટેપ કરો અને બોલો (Tap Mic to Speak)');
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSupported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setInterimTranscript('');
      setTypedInput('');
      setErrorMessage(null);
      setIsExecuting(false);
      setStatusMessage('માઈક્રોફોન પર ટેપ કરો અને બોલો (Tap Mic to Speak)');
    }
    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    setTranscript('');
    setInterimTranscript('');
    setParsedCommand(null);
    setErrorMessage(null);
    setIsExecuting(false);
    setStatusMessage('🎙️ સાંભળી રહ્યું છે... બોલો (Listening...)');
    setIsListening(true);

    globalSpeechEngine.setLanguage(language);
    globalSpeechEngine.start(
      (text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          setInterimTranscript('');
          handleCommandExecution(text);
        } else {
          setInterimTranscript(text);
        }
      },
      () => {
        setIsListening(false);
      },
      (err) => {
        setErrorMessage(err);
        setStatusMessage('માઈક્રોફોન શરૂ થઈ શક્યો નથી');
        setIsListening(false);
      }
    );
  };

  const stopListening = () => {
    globalSpeechEngine.stop();
    setIsListening(false);
  };

  const handleCommandExecution = (spokenText: string) => {
    if (!spokenText.trim()) return;

    const command = parseVoiceCommand(spokenText);
    setParsedCommand(command);
    setIsExecuting(true);
    playChimeSound('SUCCESS');

    const feedbackText = language === 'en-IN' ? command.feedbackEnglish : command.feedbackGujarati;
    setStatusMessage(`✅ ${feedbackText}`);

    if (isVoiceFeedbackEnabled) {
      speakFeedbackText(feedbackText, language);
    }

    // Auto-execute after 900ms so user can see what was detected!
    setTimeout(() => {
      executeAction(command);
      onClose();
    }, 900);
  };

  const executeAction = (command: ParsedVoiceCommand) => {
    switch (command.intent) {
      case 'OPEN_NEW_SALE':
        onOpenNewSale();
        break;
      case 'OPEN_NEW_PURCHASE':
        onOpenNewPurchase();
        break;
      case 'OPEN_NEW_EXPENSE':
        onOpenNewExpense();
        break;
      case 'OPEN_PAYMENT_IN':
        onOpenPaymentIn();
        break;
      case 'OPEN_PAYMENT_OUT':
        onOpenPaymentOut();
        break;
      case 'NAVIGATE':
        if (command.targetView) {
          onNavigate(command.targetView);
        }
        break;
      case 'GLOBAL_SEARCH':
      case 'SEARCH_ITEM':
      case 'SEARCH_CUSTOMER':
      case 'SEARCH_SUPPLIER':
        if (command.searchQuery) {
          onGlobalSearch(command.searchQuery);
        }
        break;
      default:
        if (command.spokenText) {
          onGlobalSearch(command.spokenText);
        }
        break;
    }
  };

  const handleQuickCommandClick = (sampleText: string) => {
    setTranscript(sampleText);
    handleCommandExecution(sampleText);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)'
            }}>
              <Mic size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                માતુકી વોઇસ સહાયક <Sparkles size={16} color="#fbbf24" />
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#c7d2fe' }}>
                બોલો અને કામ થઈ જાય (Speak & Command ERP)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Language Selector */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: '14px', padding: '2px' }}>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: language === 'gu-IN' ? '#ffffff' : 'transparent',
                  color: language === 'gu-IN' ? '#1e1b4b' : '#c7d2fe',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setLanguage('gu-IN')}
              >
                ગુજરાતી
              </button>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: language === 'hi-IN' ? '#ffffff' : 'transparent',
                  color: language === 'hi-IN' ? '#1e1b4b' : '#c7d2fe',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setLanguage('hi-IN')}
              >
                हिंदी
              </button>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: language === 'en-IN' ? '#ffffff' : 'transparent',
                  color: language === 'en-IN' ? '#1e1b4b' : '#c7d2fe',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setLanguage('en-IN')}
              >
                EN
              </button>
            </div>

            {/* Voice Feedback Toggle */}
            <button
              type="button"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title={isVoiceFeedbackEnabled ? 'Audio Feedback ON' : 'Audio Feedback OFF'}
              onClick={() => setIsVoiceFeedbackEnabled(!isVoiceFeedbackEnabled)}
            >
              {isVoiceFeedbackEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          
          {/* Big Central Glowing Microphone */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Pulsing Ripple Rings when listening */}
            {isListening && (
              <>
                <div style={{
                  position: 'absolute',
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.2)',
                  animation: 'ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite'
                }} />
                <div style={{
                  position: 'absolute',
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.3)',
                  animation: 'pulse 1.2s ease-in-out infinite'
                }} />
              </>
            )}

            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: isListening 
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isListening 
                  ? '0 10px 25px rgba(239, 68, 68, 0.5)' 
                  : '0 10px 25px rgba(59, 130, 246, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 2,
                transform: isListening ? 'scale(1.08)' : 'scale(1)'
              }}
            >
              {isListening ? (
                <Mic size={38} color="#ffffff" className="animate-pulse" />
              ) : (
                <MicOff size={34} color="#ffffff" />
              )}
            </button>
          </div>

          {/* Error / Insecure Context Banner */}
          {errorMessage && (
            <div style={{
              width: '100%',
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              color: '#991b1b',
              fontSize: '0.78rem'
            }}>
              <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>{errorMessage}</strong>
                <div style={{ fontSize: '0.72rem', color: '#7f1d1d', marginTop: '3px' }}>
                  👉 મોબાઇલ પર માઈક માટે Chrome માં URL ની આગળ 🔒 અથવા ⚙️ પર ક્લિક કરી Microphone Allow કરો, અથવા નીચે બોક્સમાં ટાઈપ કરીને ઝડપથી કમાન્ડ આપો.
                </div>
              </div>
            </div>
          )}

          {/* Live Transcript & Status Display */}
          <div style={{
            width: '100%',
            minHeight: '70px',
            background: isExecuting ? '#f0fdf4' : '#f8fafc',
            border: `1.5px solid ${isExecuting ? '#86efac' : '#e2e8f0'}`,
            borderRadius: '16px',
            padding: '10px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s ease'
          }}>
            <div style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: isExecuting ? '#15803d' : '#64748b'
            }}>
              {statusMessage}
            </div>

            <div style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#0f172a',
              minHeight: '26px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {transcript || interimTranscript ? (
                <span>&ldquo;{transcript || interimTranscript}&rdquo;</span>
              ) : (
                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.92rem' }}>
                  {isListening ? 'સાંભળી રહ્યો છું... બોલો...' : 'માઈક્રોફોન બટન દબાવીને બોલો...'}
                </span>
              )}
            </div>
          </div>

          {/* ⌨️ Direct Quick Command / Search Input Box */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (typedInput.trim()) {
                setTranscript(typedInput.trim());
                handleCommandExecution(typedInput.trim());
                setTypedInput('');
              }
            }}
            style={{
              width: '100%',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              className="form-input"
              style={{
                flex: 1,
                fontSize: '0.85rem',
                padding: '8px 14px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1'
              }}
              placeholder="અથવા અહીં કમાન્ડ લખો (જેમ કે: નવું બિલ, ગુલાબ જાંબુ, રોજમેળ)..."
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{
                borderRadius: '12px',
                fontWeight: 800,
                padding: '0 16px',
                background: '#1e1b4b',
                borderColor: '#1e1b4b'
              }}
            >
              ચલાવો (Run)
            </button>
          </form>

          {/* Quick Voice Command Chips / Suggestions for Non-Educated Users */}
          <div style={{ width: '100%' }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#475569',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              👇 આ રીતે બોલો અથવા ક્લિક કરો (Quick Voice Examples):
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              <button
                type="button"
                onClick={() => handleQuickCommandClick('નવું બિલ')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ background: '#dcfce7', color: '#16a34a', padding: '6px', borderRadius: '8px' }}>
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>&ldquo;નવું બિલ&rdquo;</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Opens New Sale Billing</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCommandClick('ગુલાબ જાંબુ')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ background: '#fef3c7', color: '#d97706', padding: '6px', borderRadius: '8px' }}>
                  <Package size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>&ldquo;ગુલાબ જાંબુ&rdquo;</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Instant Sweet Search</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCommandClick('ગ્રાહક લિસ્ટ')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '6px', borderRadius: '8px' }}>
                  <Users size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>&ldquo;ગ્રાહક લિસ્ટ&rdquo;</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Customers & Khata</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCommandClick('આજનો રોજમેળ')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ background: '#fce7f3', color: '#db2777', padding: '6px', borderRadius: '8px' }}>
                  <BookOpen size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>&ldquo;આજનો રોજમેળ&rdquo;</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Daily Cash Daybook</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          color: '#64748b'
        }}>
          <span>⚡ Works completely offline in Gujarati, Hindi & English</span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onClose}
            style={{ padding: '4px 12px', fontSize: '0.74rem' }}
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
