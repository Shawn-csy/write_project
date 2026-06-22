import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";

export default function NotFound() {
  return (
    <>
      <PublicTopBar trailing={<PublicShellActions />} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="font-serif text-6xl font-black text-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          找不到這個頁面
        </p>
        <a
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          回到首頁
        </a>
      </main>
    </>
  );
}
