'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function ProgressIndicator({ steps, currentStep, className }: ProgressIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <motion.div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                index <= currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              animate={{
                scale: index === currentStep ? 1.1 : 1,
                backgroundColor: index <= currentStep ? "hsl(var(--primary))" : "hsl(var(--muted))"
              }}
              transition={{ duration: 0.3 }}
            >
              {index + 1}
            </motion.div>
            {index < steps.length - 1 && (
              <motion.div
                className="h-0.5 w-16 mx-2"
                animate={{
                  backgroundColor: index < currentStep ? "hsl(var(--primary))" : "hsl(var(--muted))"
                }}
                transition={{ duration: 0.3 }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground"
        >
          {steps[currentStep]}
        </motion.p>
      </div>
    </div>
  );
}