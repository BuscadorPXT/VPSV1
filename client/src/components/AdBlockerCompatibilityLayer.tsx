import React from 'react';

interface AdBlockerCompatibilityLayerProps {
  children: React.ReactNode;
}

export const AdBlockerCompatibilityLayer: React.FC<AdBlockerCompatibilityLayerProps> = ({ children }) => {
  // Simply render children without any ad blocker detection
  return <>{children}</>;
};