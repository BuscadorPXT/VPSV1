
import React from 'react';
import { useTesterStatus } from '@/hooks/useTesterStatus';

interface TesterBlockWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function TesterBlockWrapper({ children, className }: TesterBlockWrapperProps) {
  const { testerStatus, loading } = useTesterStatus();

  const handleAllEvents = (e: React.SyntheticEvent) => {
    if (testerStatus.isTester) {
      console.log('🚫 WRAPPER BLOCK: All events blocked for Tester user');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  };

  if (testerStatus.isTester) {
    return (
      <div 
        className={className}
        onClick={handleAllEvents}
        onMouseDown={handleAllEvents}
        onMouseUp={handleAllEvents}
        onTouchStart={handleAllEvents}
        onTouchEnd={handleAllEvents}
        onKeyDown={handleAllEvents}
        onKeyUp={handleAllEvents}
        onDoubleClick={handleAllEvents}
        onContextMenu={handleAllEvents}
        style={{ 
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'not-allowed'
        }}
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
