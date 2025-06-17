'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  children: React.ReactNode;
  label?: string;
  error?: string;
  success?: string;
  loading?: boolean;
  required?: boolean;
  className?: string;
}

export function FormField({ 
  children, 
  label, 
  error, 
  success, 
  loading, 
  required, 
  className 
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div 
      className={cn("space-y-2", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {label && (
        <motion.label 
          className={cn(
            "block text-sm font-medium transition-colors duration-200",
            isFocused ? "text-primary" : "text-foreground",
            error ? "text-destructive" : "",
            success ? "text-green-500" : ""
          )}
          animate={{ 
            scale: isFocused ? 1.02 : 1,
            color: error ? "#ef4444" : success ? "#10b981" : isFocused ? "hsl(var(--primary))" : "hsl(var(--foreground))"
          }}
          transition={{ duration: 0.2 }}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </motion.label>
      )}
      
      <div 
        className="relative"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {children}
        
        {/* Status Icons */}
        <AnimatePresence>
          {(loading || error || success) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {error && <AlertCircle className="h-4 w-4 text-destructive" />}
              {success && <CheckCircle className="h-4 w-4 text-green-500" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error/Success Messages */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-destructive flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </motion.p>
        )}
        {success && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-green-500 flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" />
            {success}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}