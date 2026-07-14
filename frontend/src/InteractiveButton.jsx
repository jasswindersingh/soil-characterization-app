import React, { useRef } from 'react';
import gsap from 'gsap';

export function InteractiveButton({ children, onClick, className, type = "button", disabled = false, sound = '/mixkit-modern-technology-select-3124.wav' }) {
  const btnRef = useRef(null);

  const playSound = () => {
    const audio = new Audio(sound);
    audio.volume = 0.35; 
    audio.play().catch(() => {}); // Catches browser privacy blocks safely
  };

  const handleMouseEnter = () => {
    if (!disabled) gsap.to(btnRef.current, { scale: 1.02, duration: 0.2, ease: 'power1.out' });
  };

  const handleMouseLeave = () => {
    if (!disabled) gsap.to(btnRef.current, { scale: 1, duration: 0.2, ease: 'power1.out' });
  };

  const handleMouseDown = () => {
    if (!disabled) {
      playSound();
      gsap.to(btnRef.current, { scale: 0.97, duration: 0.1 });
    }
  };

  const handleMouseUp = () => {
    if (!disabled) gsap.to(btnRef.current, { scale: 1.02, duration: 0.1 });
  };

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
    </button>
  );
}