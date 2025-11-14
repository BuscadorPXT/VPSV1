import { Spinner } from "./spinner";
import { RainbowLoadingWave } from "./rainbow-loading-wave";

interface LoadingFallbackProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "rainbow";
}

export function LoadingFallback({ 
  message = "Carregando...", 
  size = "md",
  className,
  variant = "rainbow"
}: LoadingFallbackProps) {
  if (variant === "rainbow") {
    return (
      <div className={`min-h-screen bg-black flex items-center justify-center ${className || ''}`}>
        <RainbowLoadingWave text={message} size={size} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-4 ${className || ''}`}>
      <Spinner size={size} className="text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}