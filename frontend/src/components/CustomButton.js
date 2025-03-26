// src/components/CustomButton.js
import React from 'react';

const CustomButton = ({ children, onClick, style, ...props }) => {
  const baseStyle = {
    padding: '8px 16px',
    fontSize: '16px',
    backgroundColor: '#007BFF', // unified color for all buttons
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '10px',
    ...style, // allows additional styling if needed
  };

  return (
    <button style={baseStyle} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

export default CustomButton;
