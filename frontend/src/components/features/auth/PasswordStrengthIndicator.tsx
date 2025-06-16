"use client";

import React from 'react';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthLabel } from '@/utils/passwordValidator';

interface PasswordStrengthIndicatorProps {
  password: string;
}

/**
 * Password strength indicator component
 * Displays a visual indicator of password strength and validation errors
 */
export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) {
    return null;
  }
  
  const validation = validatePassword(password);
  const strengthColor = getPasswordStrengthColor(validation.strength);
  const strengthLabel = getPasswordStrengthLabel(validation.strength);
  
  return (
    <div className="mt-2">
      <div className="flex items-center mb-1">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${strengthColor}`} 
            style={{ width: validation.strength === 'weak' ? '33%' : validation.strength === 'medium' ? '66%' : '100%' }}
          ></div>
        </div>
        <span className="ml-2 text-xs font-medium">{strengthLabel}</span>
      </div>
      
      {validation.errors.length > 0 && (
        <ul className="text-xs text-red-600 mt-1 space-y-1">
          {validation.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}