import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'rapsodo';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  // Athletic/Pro feel: Slightly less rounded (rounded-md), bold font
  const baseStyles = "px-6 py-3 rounded-md font-bold uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]";
  
  const variants = {
    primary: "bg-white text-black hover:bg-gray-100 focus:ring-white border border-transparent shadow-md",
    secondary: "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 focus:ring-zinc-600",
    outline: "bg-transparent border-2 border-zinc-600 text-zinc-300 hover:border-white hover:text-white focus:ring-white",
    // Rapsodo Official Red
    rapsodo: "bg-[#C8102E] text-white hover:bg-[#A6192E] border border-transparent shadow-[0_4px_14px_0_rgba(200,16,46,0.39)] focus:ring-[#C8102E]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};