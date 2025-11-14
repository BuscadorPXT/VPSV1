/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'gober': ['Gober', 'Inter', 'system-ui', 'sans-serif'],
        'sans': ['Gober', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "flash-green": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "rgba(16,185,129,0.3)" },
        },
        "flash-red": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "rgba(239,68,68,0.3)" },
        },
        "price-pulse": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        "mobile-slide-up": {
          "0%": { 
            transform: "translateY(100%)",
            opacity: "0"
          },
          "100%": { 
            transform: "translateY(0)",
            opacity: "1"
          },
        },
        "mobile-slide-down": {
          "0%": { 
            transform: "translateY(0)",
            opacity: "1"
          },
          "100%": { 
            transform: "translateY(100%)",
            opacity: "0"
          },
        },
        "mobile-press": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' }
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' }
        },
        bounce: {
          '0%, 100%': {
            transform: 'translateY(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8,0,1,1)'
          },
          '50%': {
            transform: 'none',
            animationTimingFunction: 'cubic-bezier(0,0,0.2,1)'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-10px) rotate(1deg)' },
          '50%': { transform: 'translateY(-5px) rotate(0deg)' },
          '75%': { transform: 'translateY(-15px) rotate(-1deg)' },
        },
        fadeIn: {
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        blurIn: {
          'to': { opacity: '1', filter: 'blur(0)' },
        },
        'scroll-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "flash-green": "flash-green 0.6s ease-in-out",
        "flash-red": "flash-red 0.6s ease-in-out",
        "price-pulse": "price-pulse 0.4s ease-in-out",
        "mobile-slide-up": "mobile-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "mobile-slide-down": "mobile-slide-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "mobile-press": "mobile-press 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
        float: "float 6s ease-in-out infinite",
        fadeIn: "fadeIn 0.8s ease-out forwards",
        slideInLeft: "slideInLeft 0.8s ease-out forwards",
        slideInRight: "slideInRight 0.8s ease-out forwards",
        blurIn: "blurIn 1.2s ease-out forwards",
        'scroll-left': 'scroll-left 30s linear infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography"), function({ addUtilities }: { addUtilities: Function }) {
      const rotateXUtilities: Record<string, any> = {};
      const rotateYUtilities: Record<string, any> = {};
      const rotateZUtilities: Record<string, any> = {};
      const rotateValues = [0, 5, 10, 15, 20, 30, 45, 75];

      // Generate rotate-x utilities
      rotateValues.forEach((value) => {
        rotateXUtilities[`.rotate-x-${value}`] = {
          '--tw-rotate-x': `${value}deg`,
          transform: `
            translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
            rotateX(var(--tw-rotate-x, 0))
            rotateY(var(--tw-rotate-y, 0))
            rotateZ(var(--tw-rotate-z, 0))
            skewX(var(--tw-skew-x, 0))
            skewY(var(--tw-skew-y, 0))
            scaleX(var(--tw-scale-x, 1))
            scaleY(var(--tw-scale-y, 1))
          `.replace(/\s+/g, ' ').trim(),
        };
        if (value !== 0) {
          rotateXUtilities[`.-rotate-x-${value}`] = {
            '--tw-rotate-x': `-${value}deg`,
            transform: `
              translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
              rotateX(var(--tw-rotate-x, 0))
              rotateY(var(--tw-rotate-y, 0))
              rotateZ(var(--tw-rotate-z, 0))
              skewX(var(--tw-skew-x, 0))
              skewY(var(--tw-skew-y, 0))
              scaleX(var(--tw-scale-x, 1))
              scaleY(var(--tw-scale-y, 1))
            `.replace(/\s+/g, ' ').trim(),
          };
        }
      });

      // Generate rotate-y utilities
      rotateValues.forEach((value) => {
        rotateYUtilities[`.rotate-y-${value}`] = {
          '--tw-rotate-y': `${value}deg`,
          transform: `
            translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
            rotateX(var(--tw-rotate-x, 0))
            rotateY(var(--tw-rotate-y, 0))
            rotateZ(var(--tw-rotate-z, 0))
            skewX(var(--tw-skew-x, 0))
            skewY(var(--tw-skew-y, 0))
            scaleX(var(--tw-scale-x, 1))
            scaleY(var(--tw-scale-y, 1))
          `.replace(/\s+/g, ' ').trim(),
        };
        if (value !== 0) {
          rotateYUtilities[`.-rotate-y-${value}`] = {
            '--tw-rotate-y': `-${value}deg`,
            transform: `
              translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
              rotateX(var(--tw-rotate-x, 0))
              rotateY(var(--tw-rotate-y, 0))
              rotateZ(var(--tw-rotate-z, 0))
              skewX(var(--tw-skew-x, 0))
              skewY(var(--tw-skew-y, 0))
              scaleX(var(--tw-scale-x, 1))
              scaleY(var(--tw-scale-y, 1))
            `.replace(/\s+/g, ' ').trim(),
          };
        }
      });

      // Generate rotate-z utilities
      rotateValues.forEach((value) => {
        rotateZUtilities[`.rotate-z-${value}`] = {
          '--tw-rotate-z': `${value}deg`,
          transform: `
            translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
            rotateX(var(--tw-rotate-x, 0))
            rotateY(var(--tw-rotate-y, 0))
            rotateZ(var(--tw-rotate-z, 0))
            skewX(var(--tw-skew-x, 0))
            skewY(var(--tw-skew-y, 0))
            scaleX(var(--tw-scale-x, 1))
            scaleY(var(--tw-scale-y, 1))
          `.replace(/\s+/g, ' ').trim(),
        };
        if (value !== 0) {
          rotateZUtilities[`.-rotate-z-${value}`] = {
            '--tw-rotate-z': `-${value}deg`,
            transform: `
              translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0))
              rotateX(var(--tw-rotate-x, 0))
              rotateY(var(--tw-rotate-y, 0))
              rotateZ(var(--tw-rotate-z, 0))
              skewX(var(--tw-skew-x, 0))
              skewY(var(--tw-skew-y, 0))
              scaleX(var(--tw-scale-x, 1))
              scaleY(var(--tw-scale-y, 1))
            `.replace(/\s+/g, ' ').trim(),
          };
        }
      });

      // Perspective utilities
      const perspectiveUtilities = {
        ".perspective-none": { perspective: "none" },
        ".perspective-dramatic": { perspective: "100px" },
        ".perspective-near": { perspective: "300px" },
        ".perspective-normal": { perspective: "500px" },
        ".perspective-midrange": { perspective: "800px" },
        ".perspective-distant": { perspective: "1200px" },
      };

      // Transform style utilities
      const transformStyleUtilities = {
        ".transform-style-preserve-3d": { "transform-style": "preserve-3d" },
        ".transform-style-flat": { "transform-style": "flat" },
      };

      addUtilities({
        ...rotateXUtilities,
        ...rotateYUtilities,
        ...rotateZUtilities,
        ...perspectiveUtilities,
        ...transformStyleUtilities,
      });
    }
  ],
}