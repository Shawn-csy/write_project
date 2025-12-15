export const homeContent = {
  label: "使用說明",
  title: "Fountain 快速指南",
  introHtml: `
    <div class="space-y-6 text-sm">
      <p class="text-muted-foreground">
        本閱讀器支援標準 <strong>Fountain</strong> 語法。以下是撰寫時的速查表，所有範例皆可直接複製使用。
      </p>
      <p>右上角的選單可以選擇角色高亮或是隱藏其他角色進行順讀，旁邊的印表機可以下載為PDF。</>
      <p class="text-xs text-muted-foreground">快捷鍵：Ctrl/Cmd + [ 或 ] 調整字級、Ctrl/Cmd + B 開合列表、Ctrl/Cmd + G 切換順讀（需先選角色）、Ctrl/Cmd + ↑/↓ 跳場景、Ctrl/Cmd + ←/→ 固定行數捲動。</p>
      <p class="text-xs text-muted-foreground">測試：專案內建 <code>npm test</code>（Node 20+），涵蓋劇本前處理與 PDF 標記轉換。</p>

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
            <span>→ 三行區塊，中央顯示「停頓一秒」</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">中留白</span> 
            <span>→ 三行區塊，中央顯示「停頓三秒」</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">長留白</span> 
            <span>→ 三行區塊，中央顯示「停頓五秒」</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">留白</span> 
            <span>→ 三行空白（無文字）</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">[SFX: 海浪聲]</span>
            <span>→ 音效標記，顯示為 SFX 色塊</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">[遠處左方]</span>
            <span>→ 方位/距離標記，淡色區塊</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="font-mono font-bold text-foreground">(低聲)</span>
            <span>→ 情緒/口氣/動作（括號）</span>
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
    "📁 拖曳或點擊左側區域載入 .fountain 檔案",
    "👁️ 點擊右上角「角色選單」開啟順讀模式（Focus Mode）",
    "📄 匯出 PDF 會自動套用標準劇本格式，適合列印",
  ],
  demo: `Title: Demo Screenplay
Author: Your Name
Credit: Written by
Source: Story Source

.INT. STAGE - NIGHT

!燈光暗下，遠處傳來雷聲。

@旁白
(低聲且神秘)
今晚，一切將被改寫。

JENNY ^
我聽見了。

MIKE
我也是。

!兩人互看一眼。

~Singing softly in the rain...

>SMASH CUT TO:

EXT. ROOFTOP - DAWN

/* 這裡是隱藏的筆記：
記得檢查這一場的轉場效果
*/

[[導演筆記：這裡需要強光]]`,
};
