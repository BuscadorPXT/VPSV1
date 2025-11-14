import { cn } from "@/lib/utils";
import { RainbowLoadingWave } from "./rainbow-loading-wave";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "rainbow";
}

export function Spinner({ size = "md", className, variant = "default" }: SpinnerProps) {
  if (variant === "rainbow") {
    return <RainbowLoadingWave size={size} className={className} />;
  }

  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-4", 
    lg: "h-12 w-12 border-4"
  };

  return (
    <div 
      className={cn(
        "inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading..."
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingSpinner({ 
  text = "Carregando...", 
  variant = "rainbow" 
}: { 
  text?: string;
  variant?: "default" | "rainbow";
}) {
  if (variant === "rainbow") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RainbowLoadingWave text={text} size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Spinner size="lg" className="mb-4" />
      <p className="text-gray-600 dark:text-gray-400">{text}</p>
    </div>
  );
}