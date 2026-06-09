export default function Home() {
  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com";

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">Screenplay Reader Public</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">公開閱讀服務</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          目前 Next.js public app 已接管公開台本閱讀頁。首頁列表仍由既有 Vite app 提供，
          後續階段會再遷移到這裡。
        </p>
        <a
          href={publicBaseUrl}
          className="mt-8 inline-flex rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          返回公開列表
        </a>
      </div>
    </main>
  );
}
