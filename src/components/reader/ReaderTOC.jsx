import React from "react";
import { Menu, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { ScrollArea } from "../../components/ui/scroll-area";

export function ReaderTOC({ sceneList = [], currentSceneId, onSelectScene }) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (id) => {
      onSelectScene(id);
      setOpen(false);
  };

  if (!sceneList || sceneList.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Table of Contents">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 flex flex-col h-full bg-background/95 backdrop-blur-md">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="font-serif">Table of Contents</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
            <div className="flex flex-col py-2">
                {sceneList && sceneList.length > 0 ? (
                    sceneList.map((scene, i) => (
                        <button
                            key={scene.id}
                            onClick={() => handleSelect(scene.id)}
                            className={`
                                flex items-center justify-between w-full px-6 py-3 text-left transition-colors
                                ${currentSceneId === scene.id 
                                    ? "bg-primary/10 text-primary font-medium" 
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                }
                            `}
                        >
                            <div className="flex items-start gap-3 overflow-hidden">
                                <span className="text-xs opacity-50 font-mono mt-0.5 min-w-[1.5rem]">{i+1}.</span>
                                <span className="truncate leading-tight text-sm">{scene.label}</span>
                            </div>
                            {currentSceneId === scene.id && <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />}
                        </button>
                    ))
                ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No scenes found in this script.
                    </div>
                )}
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
