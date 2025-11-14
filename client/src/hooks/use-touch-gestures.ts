
import { useState, useRef, useCallback } from 'react'

interface TouchPoint {
  x: number
  y: number
  time: number
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down'
  distance: number
  velocity: number
}

interface TapGesture {
  x: number
  y: number
  duration: number
}

interface UseTouchGesturesOptions {
  onSwipe?: (gesture: SwipeGesture) => void
  onTap?: (gesture: TapGesture) => void
  onLongPress?: (point: TouchPoint) => void
  swipeThreshold?: number
  longPressDelay?: number
  tapMaxDuration?: number
}

export function useTouchGestures(options: UseTouchGesturesOptions = {}) {
  const {
    onSwipe,
    onTap,
    onLongPress,
    swipeThreshold = 50,
    longPressDelay = 500,
    tapMaxDuration = 200
  } = options

  const [isPressed, setIsPressed] = useState(false)
  const touchStart = useRef<TouchPoint | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent | React.TouchEvent) => {
    const touch = 'touches' in e ? e.touches[0] : e.touches[0]
    const now = Date.now()
    
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: now
    }
    
    setIsPressed(true)
    
    // Setup long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (touchStart.current) {
          onLongPress(touchStart.current)
        }
      }, longPressDelay)
    }
  }, [onLongPress, longPressDelay])

  const handleTouchMove = useCallback((e: TouchEvent | React.TouchEvent) => {
    if (!touchStart.current) return
    
    const touch = 'touches' in e ? e.touches[0] : e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStart.current.x)
    const deltaY = Math.abs(touch.clientY - touchStart.current.y)
    
    // If movement is significant, cancel long press
    if (deltaX > 10 || deltaY > 10) {
      clearTimers()
    }
  }, [clearTimers])

  const handleTouchEnd = useCallback((e: TouchEvent | React.TouchEvent) => {
    if (!touchStart.current) return
    
    const touch = 'changedTouches' in e ? e.changedTouches[0] : e.changedTouches[0]
    const now = Date.now()
    const deltaX = touch.clientX - touchStart.current.x
    const deltaY = touch.clientY - touchStart.current.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = now - touchStart.current.time
    
    clearTimers()
    setIsPressed(false)
    
    // Detect swipe
    if (distance > swipeThreshold) {
      const velocity = distance / duration
      let direction: SwipeGesture['direction']
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }
      
      onSwipe?.({
        direction,
        distance,
        velocity
      })
    }
    // Detect tap
    else if (duration < tapMaxDuration && distance < 10) {
      onTap?.({
        x: touch.clientX,
        y: touch.clientY,
        duration
      })
    }
    
    touchStart.current = null
  }, [onSwipe, onTap, swipeThreshold, tapMaxDuration, clearTimers])

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }

  return {
    touchHandlers,
    isPressed,
    // For programmatic control
    resetGesture: () => {
      clearTimers()
      setIsPressed(false)
      touchStart.current = null
    }
  }
}
