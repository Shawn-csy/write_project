import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "../../lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(
  ({ className, onTouchStart, onTouchEnd, ...props }, ref) => {
    const touchStart = React.useRef(null)

    const handleTouchStart = (e) => {
      onTouchStart?.(e)
      if (e.defaultPrevented) return
      const t = e.touches?.[0]
      if (!t) return
      touchStart.current = { x: t.clientX, y: t.clientY }
    }

    const handleTouchEnd = (e) => {
      onTouchEnd?.(e)
      if (e.defaultPrevented) return
      if (!touchStart.current) return
      if (e.target?.closest?.("input, textarea, select, [contenteditable=\"true\"]")) {
        touchStart.current = null
        return
      }
      const t = e.changedTouches?.[0]
      if (!t) return
      const dx = t.clientX - touchStart.current.x
      const dy = t.clientY - touchStart.current.y
      touchStart.current = null

      if (Math.abs(dx) < 60 || Math.abs(dy) > 30) return

      const root = e.currentTarget.closest("[role=\"tabpanel\"]")?.parentElement || document
      const tablist = root.querySelector?.("[role=\"tablist\"]")
      const tabs = tablist ? Array.from(tablist.querySelectorAll("[role=\"tab\"]")) : []
      if (!tabs.length) return

      const activeIndex = tabs.findIndex(
        (el) => el.getAttribute("aria-selected") === "true" || el.dataset.state === "active"
      )
      if (activeIndex === -1) return

      let nextIndex = dx < 0 ? activeIndex + 1 : activeIndex - 1
      if (nextIndex < 0) nextIndex = tabs.length - 1
      if (nextIndex >= tabs.length) nextIndex = 0
      tabs[nextIndex].click()
    }

    return (
      <TabsPrimitive.Content
        ref={ref}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        {...props}
      />
    )
  }
)
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
