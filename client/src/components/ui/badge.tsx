import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  withWhatsAppIcon?: boolean;
}

function Badge({ className, variant, withWhatsAppIcon = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {withWhatsAppIcon && (
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          className="mr-1 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M17.472 14.382C17.233 14.262 15.963 13.635 15.754 13.545C15.545 13.456 15.395 13.411 15.244 13.65C15.094 13.889 14.616 14.485 14.495 14.635C14.375 14.785 14.254 14.802 14.015 14.682C13.776 14.562 12.985 14.308 12.042 13.465C11.313 12.808 10.829 12.005 10.708 11.766C10.588 11.527 10.695 11.414 10.815 11.295C10.924 11.186 11.054 11.015 11.174 10.895C11.294 10.775 11.339 10.685 11.429 10.535C11.518 10.385 11.474 10.265 11.414 10.145C11.354 10.025 10.874 8.755 10.695 8.275C10.521 7.809 10.342 7.869 10.207 7.862C10.078 7.855 9.928 7.854 9.778 7.854C9.628 7.854 9.389 7.914 9.18 8.154C8.971 8.393 8.314 9.02 8.314 10.29C8.314 11.56 9.21 12.79 9.33 12.94C9.45 13.09 10.869 15.29 13.109 16.43C13.649 16.68 14.069 16.83 14.399 16.94C14.939 17.11 15.429 17.09 15.819 17.03C16.259 16.96 17.289 16.41 17.519 15.8C17.749 15.19 17.749 14.67 17.689 14.57C17.629 14.47 17.479 14.41 17.24 14.29L17.472 14.382Z" 
            fill="currentColor"
          />
          <path 
            fillRule="evenodd" 
            clipRule="evenodd" 
            d="M12 2C6.477 2 2 6.477 2 12C2 13.89 2.525 15.66 3.438 17.168L2.546 20.2C2.491 20.365 2.495 20.544 2.557 20.706C2.619 20.868 2.736 21.002 2.888 21.082C3.04 21.162 3.217 21.183 3.383 21.141L6.832 20.562C8.34 21.475 10.11 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 4C16.411 4 20 7.589 20 12C20 16.411 16.411 20 12 20C10.33 20 8.773 19.516 7.455 18.686L7.257 18.562L4.697 19.062L5.438 17.257L5.314 17.059C4.484 15.741 4 14.184 4 12.514C4 7.589 7.589 4 12 4Z" 
            fill="currentColor"
          />
        </svg>
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
