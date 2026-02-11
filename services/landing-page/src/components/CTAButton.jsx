'use client';

export default function CTAButton({ text, onClick }) {
  return (
    <button className="cta-button" onClick={onClick}>
      {text || 'Get Started'}
    </button>
  );
}
