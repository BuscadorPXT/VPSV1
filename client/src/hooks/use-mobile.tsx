import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const SMALL_MOBILE_BREAKPOINT = 480

// Define a interface DeviceInfo
interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isTouch: boolean
  isSmallMobile: boolean
  orientation: 'portrait' | 'landscape'
  filtersExpanded: boolean
  viewportHeight: number
  viewportWidth: number
  safeAreaInsets: {
    top: number
    bottom: number
  }
}

export function useIsMobile() {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isTouch: false,
    isSmallMobile: false,
    orientation: 'portrait',
    filtersExpanded: false, // SEMPRE ocultos por padrão
    viewportHeight: 0,
    viewportWidth: 0,
    safeAreaInsets: { top: 0, bottom: 0 }
  })

  React.useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isMobile = width < MOBILE_BREAKPOINT
      const isSmallMobile = width < SMALL_MOBILE_BREAKPOINT
      const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const orientation = width > height ? 'landscape' : 'portrait'

      // Get safe area insets for modern mobile browsers
      const style = getComputedStyle(document.documentElement)
      const safeAreaTop = parseInt(style.getPropertyValue('--safe-area-inset-top') || '0')
      const safeAreaBottom = parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0')

      setDeviceInfo(prev => ({
        ...prev,
        isMobile,
        isSmallMobile,
        isTablet,
        isTouch,
        orientation,
        viewportHeight: height,
        viewportWidth: width,
        safeAreaInsets: {
          top: safeAreaTop,
          bottom: safeAreaBottom
        }
        // Remover controle de filtros do hook - será gerenciado pelo componente
      }))
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const orientationQuery = window.matchMedia('(orientation: portrait)')
    const smallMobileQuery = window.matchMedia(`(max-width: ${SMALL_MOBILE_BREAKPOINT - 1}px)`)

    mediaQuery.addEventListener("change", updateDeviceInfo)
    orientationQuery.addEventListener("change", updateDeviceInfo)
    smallMobileQuery.addEventListener("change", updateDeviceInfo)
    window.addEventListener("resize", updateDeviceInfo)

    updateDeviceInfo()

    return () => {
      mediaQuery.removeEventListener("change", updateDeviceInfo)
      orientationQuery.removeEventListener("change", updateDeviceInfo)
      smallMobileQuery.removeEventListener("change", updateDeviceInfo)
      window.removeEventListener("resize", updateDeviceInfo)
    }
  }, [])

  const toggleMobileFilters = React.useCallback(() => {
    setDeviceInfo(prev => ({
      ...prev,
      filtersExpanded: !prev.filtersExpanded
    }))
  }, [])

  const setMobileFiltersExpanded = React.useCallback((expanded: boolean) => {
    setDeviceInfo(prev => ({
      ...prev,
      filtersExpanded: expanded
    }))
  }, [])

  return {
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
    isTouch: deviceInfo.isTouch,
    isSmallMobile: deviceInfo.isSmallMobile,
    orientation: deviceInfo.orientation,
    filtersExpanded: deviceInfo.filtersExpanded,
    viewportHeight: deviceInfo.viewportHeight,
    viewportWidth: deviceInfo.viewportWidth,
    safeAreaInsets: deviceInfo.safeAreaInsets,
    toggleMobileFilters,
    setMobileFiltersExpanded,
    // Backward compatibility
    ...deviceInfo
  }
}

// Hook específico para compatibilidade
export function useIsMobileOnly() {
  const { isMobile } = useIsMobile()
  return isMobile
}
export function useMobile() {
  const { isMobile } = useIsMobile();
  return isMobile;
}
