import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { calculateStats } from "../../lib/statistics";
import { BarChart, Clock, MessageSquare, MapPin, Users } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

export default function StatsDialog({ open, onOpenChange, content }) {
  const stats = useMemo(() => calculateStats(content), [content]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b shrink-0 bg-background z-20">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart className="w-5 h-5 text-primary" />
            劇本統計分析
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard 
              icon={<MapPin className="w-4 h-4" />} 
              label="總場景數" 
              value={stats.sceneCount} 
              sub={`INT: ${stats.timeframeDistribution.INT} / EXT: ${stats.timeframeDistribution.EXT}`}
            />
            <StatCard 
              icon={<Users className="w-4 h-4" />} 
              label="角色數量" 
              value={stats.characterStats.length} 
            />
             <StatCard 
              icon={<MessageSquare className="w-4 h-4" />} 
              label="對白比例" 
              value={`${stats.dialogueRatio}%`} 
              sub={`動作: ${stats.actionRatio}%`}
            />
             {/* Simple Estimation: 1 Scene ~ 1.5 mins? Or 1 page ~ 1 min?
                 Ideally page count is better, but we don't have pagination yet.
                 Let's estimate by blocks roughly. 
              */}
              <StatCard 
              icon={<Clock className="w-4 h-4" />} 
              label="預估讀本時間" 
              value={`~${Math.ceil((stats.totalBlocks * 2.5) / 60)} 分`} 
              sub="粗略估算"
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                角色台詞排行榜
              </h3>
              <div className="space-y-2">
                {stats.characterStats.slice(0, 10).map((char, idx) => (
                  <div key={char.name} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-muted-foreground font-mono text-xs">{idx + 1}.</span>
                    <div className="w-24 sm:w-32 font-medium truncate" title={char.name}>{char.name}</div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary/70" 
                        style={{ width: `${(char.count / (stats.characterStats[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-muted-foreground">{char.count}</span>
                  </div>
                ))}
                {stats.characterStats.length === 0 && (
                    <p className="text-muted-foreground text-sm">尚無角色資料</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3 sm:p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-bold">{value}</div>
      {sub && <div className="text-[10px] sm:text-xs text-muted-foreground opacity-80">{sub}</div>}
    </div>
  );
}
