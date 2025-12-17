export const aboutContent = {
  label: "關於",
  title: "關於劇本閱讀器",
  introHtml: `
    <div class="space-y-8">
      <div class="space-y-2">
        <p class="text-base text-muted-foreground leading-relaxed">
          這是一個為創作者<del>偷薪</del>設計的工具，支援 <strong>Fountain</strong> 語法解析。
        </p>
        <p>使用git進行版本控制，切換分支跟回溯。</p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        
        <div class="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div class="mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="accent-label"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <h3 class="font-semibold">開發初衷</h3>
          </div>
          <ul class="space-y-2 text-sm text-muted-foreground">
            <li class="flex items-start gap-2">
              <span class="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full accent-dot"></span>
              <span>Google Docs 用到煩了</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full accent-dot"></span>
              <span>預設掃描專案目錄，便於版本控管。</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full accent-dot"></span>
              <del><span class="italic text-foreground">"主要是為了上班打的時候，看起來像是在寫 Code。"</span></del>
            </li>
          </ul>
        </div>

        <div class="rounded-lg border bg-card p-4 text-card-foreground shadow-sm flex flex-col justify-between">
          <div>
            <div class="mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="accent-label"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <h3 class="font-semibold">版本日誌</h3>
            </div>
            <div class="mb-4 flex items-center gap-2">
              <span class="rounded-md px-2 py-1 text-xs font-medium accent-pill">Current v0.2.2</span>
            </div>
            <p class="text-sm text-muted-foreground">
              目前已實裝：
            </p>
            <ul class="mt-1 text-sm text-muted-foreground list-disc list-inside">
              <li>劇本載入與過濾</li>
              <li>角色過濾 (順讀模式)</li>
              <li>PDF 匯出與樣式調整</li>
              <li>色彩樣式＆基本靜態部署</li>
              <li>基本url分享支援</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h3 class="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Connect</h3>
        <div class="grid gap-3 sm:grid-cols-3">
          
          <a href="https://discord.com/users/booostman1" target="_blank" rel="noreferrer" 
             class="group flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground">
            <svg class="h-5 w-5 fill-current text-[#5865F2] group-hover:text-foreground transition-colors" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.89,105.89,0,0,0,126.6,80.22c1.24-23.28-3.28-47.54-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            <span>Discord</span>
          </a>

          <a href="https://github.com/Shawn-csy/write_project" target="_blank" rel="noreferrer"
             class="group flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground">
            <svg class="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.65.5.5 5.64.5 12c0 5.1 3.3 9.41 7.88 10.94.58.1.79-.25.79-.56 0-.28-.01-1.03-.02-2.02-3.2.69-3.87-1.54-3.87-1.54-.53-1.36-1.3-1.72-1.3-1.72-1.07-.74.08-.73.08-.73 1.18.08 1.8 1.22 1.8 1.22 1.05 1.8 2.74 1.28 3.41.98.1-.76.41-1.28.75-1.58-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.45.11-3.02 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.57.23 2.73.11 3.02.75.81 1.2 1.84 1.2 3.1 0 4.43-2.69 5.4-5.25 5.68.42.36.8 1.08.8 2.18 0 1.58-.02 2.85-.02 3.23 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12c0-6.36-5.15-11.5-11.5-11.5Z"/></svg>
            <span>GitHub</span>
          </a>

          <a href="mailto:silence0603@gmail.com"
             class="group flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground">
             <svg class="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm9.06 7.64L20 7H4l7.06 4.64a2 2 0 0 0 2.12 0ZM4 9.56V18h16V9.56l-6.37 4.19a4 4 0 0 1-4.26 0Z"/></svg>
            <span>Email</span>
          </a>
        </div>
      </div>

      <div class="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground text-center">
      <p>也有部署在google cloud run 上, 目前的機制是當我推送pr到主板且合併的時候才會自動更新雲端的容器。
      </p>
      <br>
        <p>
          本專案採用 
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" class="underline hover:text-foreground">CC BY 4.0</a> 
          授權。
          <br class="sm:hidden">
          保留姓名標示即可任意修改、重製、販售。
        </p>
      </div>
    </div>
  `,
  quickGuide: [],
  copyright: "© 2025 Developed by Shawn. Open Source under CC BY 4.0.",
};
