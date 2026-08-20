import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Quote, Heart, Lightbulb } from 'lucide-react';

interface BusinessQuote {
  quote: string;
  author: string;
  category: string;
}

const BUSINESS_QUOTES: BusinessQuote[] = [
  {
    quote: "If you work just for money, you'll never make it. But if you love what you're doing and you always put the customer first, success will be yours.",
    author: "Ray Kroc (McDonald's Founder)",
    category: "Customer First"
  },
  {
    quote: "If you want to walk fast, walk alone. But if you want to walk far, walk together.",
    author: "Ratan Tata (Tata Sons)",
    category: "Teamwork & Longevity"
  },
  {
    quote: "Pursue your goals even in the face of difficulties, and convert adversities into opportunities.",
    author: "Dhirubhai Ambani (Reliance Industries)",
    category: "Perseverance"
  },
  {
    quote: "Quality is remembered long after the price is forgotten.",
    author: "Guccio Gucci",
    category: "Product Excellence"
  },
  {
    quote: "A satisfied customer is the best business strategy of all.",
    author: "Michael LeBoeuf",
    category: "Customer Delight"
  },
  {
    quote: "Success in business requires training, discipline and hard work. But if you're not frightened by these things, the opportunities are just as great today as they ever were.",
    author: "David Rockefeller",
    category: "Discipline"
  },
  {
    quote: "Trust is the currency of commerce. Keep your word with customers and suppliers, and your business will outlive generations.",
    author: "Indian Vyapar Ethos",
    category: "Vyapar Niti"
  },
  {
    quote: "It takes 20 years to build a reputation and five minutes to ruin it. If you think about that, you'll do things differently.",
    author: "Warren Buffett",
    category: "Reputation"
  },
  {
    quote: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "Execution"
  },
  {
    quote: "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.",
    author: "Colin Powell",
    category: "Preparation"
  },
  {
    quote: "Customer loyalty is earned with every sweet, every interaction, and every honest bill delivered with a smile.",
    author: "Matuki Sweets Principle",
    category: "Sweet Hospitality"
  },
  {
    quote: "Don't find customers for your products, find products for your customers.",
    author: "Seth Godin",
    category: "Innovation"
  },
  {
    quote: "Opportunities don't happen. You create them.",
    author: "Chris Grosser",
    category: "Initiative"
  },
  {
    quote: "Great things in business are never done by one person. They're done by a team of people.",
    author: "Steve Jobs",
    category: "Leadership"
  },
  {
    quote: "Turn your wounds into wisdom, and your daily khata into clear financial strength.",
    author: "Business Wisdom",
    category: "Financial Clarity"
  }
];

export const MotivationalQuoteWidget: React.FC = () => {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * BUSINESS_QUOTES.length));
  const [fadeAnim, setFadeAnim] = useState(true);

  // 15 minutes rotation = 15 * 60 * 1000 ms = 900,000 ms
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeAnim(false);
      setTimeout(() => {
        setQuoteIndex(prev => (prev + 1) % BUSINESS_QUOTES.length);
        setFadeAnim(true);
      }, 300);
    }, 900000); // Every 15 minutes

    return () => clearInterval(interval);
  }, []);

  const handleNextQuote = () => {
    setFadeAnim(false);
    setTimeout(() => {
      setQuoteIndex(prev => (prev + 1) % BUSINESS_QUOTES.length);
      setFadeAnim(true);
    }, 200);
  };

  const current = BUSINESS_QUOTES[quoteIndex];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
      border: '1.5px solid #fde68a',
      borderRadius: '12px',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Golden Accent Ribbon */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          color: '#d97706',
          padding: '10px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(217, 119, 6, 0.15)',
          flexShrink: 0
        }}>
          <Sparkles size={20} />
        </div>

        <div style={{
          flex: 1,
          opacity: fadeAnim ? 1 : 0,
          transform: fadeAnim ? 'translateY(0)' : 'translateY(4px)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💡 Daily Vyapar Inspiration (Rotates every 15m)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              #{quoteIndex + 1} of {BUSINESS_QUOTES.length}
            </span>
          </div>

          <div style={{
            fontSize: '0.86rem',
            fontWeight: 700,
            color: '#1e293b',
            lineHeight: 1.4,
            fontStyle: 'italic'
          }}>
            "{current.quote}"
          </div>

          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#b45309', marginTop: '3px' }}>
            — {current.author}
          </div>
        </div>
      </div>

      {/* Refresh Quote Button */}
      <button
        onClick={handleNextQuote}
        style={{
          background: '#ffffff',
          border: '1px solid #fde68a',
          color: '#b45309',
          padding: '6px 10px',
          borderRadius: '8px',
          fontSize: '0.72rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.15s ease'
        }}
        title="Show Next Business Quote"
      >
        <RefreshCw size={12} /> New Quote
      </button>
    </div>
  );
};
