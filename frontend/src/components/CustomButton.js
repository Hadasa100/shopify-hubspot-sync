// src/components/CustomButton.js
import React from 'react';

const CustomButton = ({ children, onClick, className = '', ...props }) => {
  return (
    <button className={`btn btn-primary ${className}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

export default CustomButton;
