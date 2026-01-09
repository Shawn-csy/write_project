export const homeContent = {
  label: "使用說明",
  title: "Fountain 快速指南",
  introHtml: `
    <div class="space-y-6 text-sm">
      <p class="text-muted-foreground">
        本閱讀器支援標準 <strong>Fountain</strong> 語法。以下是撰寫時的速查表，所有範例皆可直接複製使用。
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
        <ul class="space-y-1 list-disc pl-4">
          <li><strong>左側選單</strong>：支援關鍵字搜尋與資料夾收合。</li>
          <li><strong>設定面板</strong>：點擊左下角 <span class="inline-block align-middle"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></span> 圖示，可調整主題、字級與顯示模式。</li>
        </ul>
        <ul class="space-y-1 list-disc pl-4">
          <li><strong>閱讀工具</strong>：上方標題列可快速跳轉場景或篩選特定角色。</li>
          <li><strong>快捷鍵</strong>：<code>Cmd/Ctrl + B</code> 收合列表、<code>Cmd/Ctrl + [ / ]</code> 調整字級。</li>
        </ul>
      </div>

      <div>
        <h3 class="mb-3 text-lg font-semibold tracking-tight">撰寫指南核心元素</h3>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          
          <div class="rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
            <div class="mb-1 font-medium">場景 (Scene Heading)</div>
            <p class="mb-2 text-xs text-muted-foreground">以 INT/EXT 開頭，前方需留空行。可用 <code>.</code> 強制標記。</p>
            <div class="rounded bg-muted/50 px-2 py-1 font-mono text-xs text-foreground">
              .INT. COFFEE SHOP - DAY
            </div>
          </div>

          <div class="rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
            <div class="mb-1 font-medium">動作 (Action)</div>
            <p class="mb-2 text-xs text-muted-foreground">一般敘述皆視為動作。可用 <code>!</code> 強制標記。</p>
            <div class="rounded bg-muted/50 px-2 py-1 font-mono text-xs text-foreground">
              !燈光慢慢亮起，雨聲漸弱。
            </div>
          </div>

          <div class="rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
            <div class="mb-1 font-medium">角色 (Character)</div>
            <p class="mb-2 text-xs text-muted-foreground">全大寫。中文或含小寫名稱需用 <code>@</code> 強制標記。</p>
            <div class="rounded bg-muted/50 px-2 py-1 font-mono text-xs text-foreground">
              @旁白<br>
              JOHNNY
            </div>
          </div>

          <div class="rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
            <div class="mb-1 font-medium">對話與括號 (Dialogue)</div>
            <p class="mb-2 text-xs text-muted-foreground">緊跟角色下方。情緒/動作括號置於對話前。</p>
            <div class="rounded bg-muted/50 px-2 py-1 font-mono text-xs text-foreground">
              WHO<br>
              (低聲)<br>
              今天會很忙。
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="mb-3 mt-4 text-lg font-semibold tracking-tight">格式與排版</h3>
        <ul class="grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">*斜體*</span> 
            <span>→ <em>斜體</em></span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">**粗體**</span> 
            <span>→ <strong>粗體</strong></span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">_底線_</span> 
            <span>→ <span class="underline">底線</span></span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">[[註釋]]</span> 
            <span>→ 隱藏筆記</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">&gt;居中&lt;</span> 
            <span>→ <span class="text-center inline-block w-16 align-middle text-xs">居中文字</span></span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">/* 隱藏 */</span> 
            <span>→ 跨行隱藏</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">短留白</span> 
            <span>→ 停頓一秒</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">中留白</span> 
            <span>→ 停頓三秒</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">長留白</span> 
            <span>→ 停頓五秒</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">| 提示</span> 
            <span>→ <span class="text-red-500 italic">行內紅色提示</span></span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">{{雨聲}} ... {{雨聲}}</span>
            <span>→ 持續音效 (開始/結束)</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">(SFX: 爆炸)^</span>
            <span>→ 同時發聲音效</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">[SFX: 海浪聲]</span>
            <span>→ 傳統音效標記</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">[遠處左方]</span>
            <span>→ 方位指示</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">(低聲)</span>
            <span>→ 情緒/動作</span>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="mb-3 mt-4 text-lg font-semibold tracking-tight">進階技巧</h3>
        <div class="space-y-3">
          <div class="flex flex-col gap-1 border-l-2 pl-3">
            <strong class="text-foreground">雙人對話 (Dual Dialogue)</strong>
            <span class="text-xs text-muted-foreground">在角色名稱後加 <code>^</code>，兩位角色的對話將並排顯示。</span>
            <code class="block w-fit rounded bg-muted/50 px-2 py-1 text-xs">JENNY ^</code>
          </div>
          
          <div class="flex flex-col gap-1 border-l-2 pl-3">
            <strong class="text-foreground">歌詞 (Lyrics)</strong>
            <span class="text-xs text-muted-foreground">行首加 <code>~</code> 會以斜體且邊界內縮顯示。</span>
            <code class="block w-fit rounded bg-muted/50 px-2 py-1 text-xs">~Singing softly in the rain</code>
          </div>

          <div class="flex flex-col gap-1 border-l-2 pl-3">
            <strong class="text-foreground">章節與大綱</strong>
            <span class="text-xs text-muted-foreground"><code>#</code> 為章節 (Section)，<code>=</code> 為大綱 (Synopsis)。</span>
            <code class="block w-fit rounded bg-muted/50 px-2 py-1 text-xs"># 第一幕 / = 英雄遇見導師</code>
          </div>
        </div>
      </div>
    </div>
  `,
  quickGuide: [
    "點擊劇本列表載入檔案，可利用上方搜尋框過濾。",
    "透過設定面板自訂閱讀體驗。",
    "點擊標題列可開啟專注模式，僅高亮選定角色台詞。",
    "隨時可匯出標準格式 PDF 進行列印或分享。",
  ],
  demo: `Title: Demo Screenplay
Author: Your Name
Credit: Written by
Source: Story Source

{{背景雨聲}}

.INT. COFFEE SHOP - NIGHT

!外頭的雨勢越來越大。

@旁白
(低聲)
有人說，雨天最適合說謊。

JOHNNY
聽著，我沒有時間解釋了。 | 焦急地看錶

短留白

MIKE
(冷笑)
你以為我會在乎嗎？ (SFX: 槍上膛聲)^

!兩人互看一眼，氣氛凝重。

{{背景雨聲}}

~Music fades out...

>THE END<`,
};
