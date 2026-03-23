import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getPublicTermsAcceptances } from "../../lib/api/admin";

export function TermsAcceptanceTable() {
  const [termsRecords, setTermsRecords] = useState([]);
  const [termsTotal, setTermsTotal] = useState(0);
  const [termsQuery, setTermsQuery] = useState("");
  const [isTermsLoading, setIsTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState("");

  const loadTermsRecords = async (queryText = "") => {
    setIsTermsLoading(true);
    setTermsError("");
    try {
      const result = await getPublicTermsAcceptances({ q: queryText, limit: 50, offset: 0 });
      setTermsRecords(result?.items || []);
      setTermsTotal(result?.total || 0);
    } catch (error) {
      console.error("Failed to load terms acceptance records", error);
      setTermsRecords([]);
      setTermsTotal(0);
      setTermsError(
        error?.status === 403
          ? "你目前不是管理員帳號（需在後端 ADMIN_USER_IDS 內），所以無法讀取簽署紀錄。"
          : "讀取簽署紀錄失敗，請確認目前連線的 API 是否為同一個環境。"
      );
    } finally {
      setIsTermsLoading(false);
    }
  };

  useEffect(() => { loadTermsRecords(""); }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <Input
          placeholder="搜尋 scriptId / visitorId / IP / UA"
          value={termsQuery}
          onChange={(e) => setTermsQuery(e.target.value)}
          className="h-8 text-sm"
        />
        <Button variant="outline" size="sm" onClick={() => loadTermsRecords(termsQuery.trim())}>
          重新整理
        </Button>
        <span className="text-xs text-muted-foreground shrink-0">共 {termsTotal} 筆</span>
      </div>
      {termsError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {termsError}
        </div>
      )}
      {isTermsLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          載入簽署紀錄中...
        </div>
      ) : termsRecords.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4">目前沒有簽署紀錄。</div>
      ) : (
        <div className="space-y-2">
          {termsRecords.map((row) => (
            <div key={row.id} className="rounded-md border p-3 text-xs">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground">
                <span className="font-semibold">版本 {row.termsVersion}</span>
                <span>時間：{new Date(row.acceptedAt || 0).toLocaleString()}</span>
                <span>IP：{row.ipAddress || "-"}</span>
                <span>visitor：{row.visitorId || "-"}</span>
              </div>
              <div className="mt-1 text-muted-foreground">
                scriptId：{row.scriptId || "-"} ｜ UA：{row.userAgent || "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
