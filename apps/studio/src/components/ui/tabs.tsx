import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
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

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, onTouchStart, onTouchEnd, ...props }, ref) => {
  const touchStart = React.useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    onTouchStart?.(e)
    if (e.defaultPrevented) return
    const t = e.touches[0]
    if (!t) return
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    onTouchEnd?.(e)
    if (e.defaultPrevented) return
    if (!touchStart.current) return
    const target = e.target as HTMLElement
    if (target.closest?.("input, textarea, select, [contenteditable=\"true\"]")) {
      touchStart.current = null
      return
    }
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 60 || Math.abs(dy) > 30) return

    const currentTarget = e.currentTarget as HTMLElement
    const root = currentTarget.closest("[role=\"tabpanel\"]")?.parentElement ?? document
    const tablist = (root as Element).querySelector?.("[role=\"tablist\"]")
    const tabs = tablist ? Array.from(tablist.querySelectorAll<HTMLElement>("[role=\"tab\"]")) : []
    if (!tabs.length) return

    const activeIndex = tabs.findIndex(
      (el) => el.getAttribute("aria-selected") === "true" || el.dataset["state"] === "active"
    )
    if (activeIndex === -1) return

    let nextIndex = dx < 0 ? activeIndex + 1 : activeIndex - 1
    if (nextIndex < 0) nextIndex = tabs.length - 1
    if (nextIndex >= tabs.length) nextIndex = 0
    tabs[nextIndex]?.click()
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
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
