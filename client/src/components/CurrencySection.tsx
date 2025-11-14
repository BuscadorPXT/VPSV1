import { CurrencyCard } from "./CurrencyCard";

export function CurrencySection() {
  return (
    <div className="w-full h-full flex items-center">
      <CurrencyCard
        pairs={['USD-BRL']}
        title="USD/BRL"
        className="w-full bg-background/80 backdrop-blur-sm border-border/50 shadow-sm"
      />
    </div>
  );
}