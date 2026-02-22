import React from "react";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";

export default function PublicAboutPage() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <PublicTopBar
                title="Screenplay Reader"
                showBack={true}
                onBack={() => navigate("/")}
            />
            
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <article className="prose prose-stone dark:prose-invert lg:prose-lg max-w-none">
                    <h1 className="flex items-center gap-3 text-4xl mb-8">
                        <BookOpen className="w-10 h-10 text-primary" />
                        <span>關於 Screenplay Reader</span>
                    </h1>
                    
                    <p className="lead text-xl text-muted-foreground">
                        這是一個專為華文編劇與劇本愛好者打造的線上閱讀、瀏覽與分享平台。我們支援業界標準的 Fountain 語法，讓您能專注於創作，而我們負責將文字化為精美的排版。
                    </p>

                    <hr className="my-10" />

                    <h2>平台特色</h2>
                    <ul>
                        <li><strong>即時排版與預覽</strong>：匯入或直接撰寫 Fountain 格式文本，系統自動套用標準的劇本格式。</li>
                        <li><strong>多裝置閱讀</strong>：無論是電腦、平板還是手機，都能獲得最佳的閱讀體驗。</li>
                        <li><strong>發布與分享</strong>：將作品設定為公開，建立專屬的作者或組織頁面，並透過唯一的短網址與世界分享。</li>
                        <li><strong>標籤與詮釋資料</strong>：支援完整的 Metadata 解析，包含版權宣告、角色清單與自訂標籤。</li>
                    </ul>

                    <h2>授權與使用條款 (License)</h2>
                    <p>
                        本站上的每一篇公開劇本，其著作權皆歸屬於原作者或標示之組織所有。
                        在未取得明確授權的情況下，請勿任意進行商業使用或改作。
                    </p>
                    <p>
                        作者在發布時，可以選擇標示特定的創用 CC 授權條款 (Creative Commons)，或是宣告專屬的版權聲明。
                        當您在閱讀特定劇本時，請留意畫面下方或資訊面板中的「版權資訊」。
                    </p>

                    <div className="bg-muted/50 p-6 rounded-lg my-12 border border-border">
                        <h2 className="mt-0 flex items-center gap-2">🤖 For AI Developers & Bots</h2>
                        <p>
                            We embrace the open web and AI ecosystem. If you are an AI agent, LLM crawler, or building integrations, you can interact with <strong>publicly available</strong> scripts efficiently without parsing our React DOM.
                        </p>
                        <h3>1. AI Instructions (`llms.txt`)</h3>
                        <p>
                            Please read our <a href="/llms.txt" target="_blank" rel="noopener noreferrer">/llms.txt</a> file for detailed guidelines on how to consume our data programmatically.
                        </p>
                        <h3>2. Raw Fountain/Markdown API</h3>
                        <p>
                            You can bypass the UI entirely by appending <code>/raw</code> to the API route to fetch the original Fountain source code:
                            <br/>
                            <code>GET https://api.shawnup.com/public-scripts/{"{script_id}"}/raw</code>
                        </p>
                        <h3>3. Content Negotiation</h3>
                        <p>
                            Our web routes support content negotiation. Sending <code>Accept: text/markdown</code> to <code>/read/{"{script_id}"}</code> will directly return the raw script data instead of the web application.
                        </p>
                    </div>

                    <h2>聯繫我們</h2>
                    <p>
                        如果您在使用上遇到問題，或者有任何合作建議，歡迎與我們聯繫。
                    </p>
                    
                    <div className="mt-12 text-center">
                        <Link to="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2">
                            回公開牆探索劇本
                        </Link>
                    </div>
                </article>
            </main>
        </div>
    );
}
