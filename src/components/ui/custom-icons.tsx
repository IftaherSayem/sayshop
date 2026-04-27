import React from "react";

export const WishlistCartIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path 
      d="M15 10c0 1.5-1.5 2.5-2.5 2.5S10 11.5 10 10s2.5-3 2.5-3 2.5 1.5 2.5 3z" 
      fill="currentColor" 
      stroke="none"
    />
  </svg>
);

export const CartAddIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    <path d="M12 9h4m-2-2v4" strokeWidth="2" />
  </svg>
);
