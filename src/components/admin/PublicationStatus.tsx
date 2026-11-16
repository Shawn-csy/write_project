import { useEffect, useState } from 'react';
import { getPublicationStatus, type PublicationStatus as Status } from '../../lib/api/publication';

export function publicationLabel(value: Status | null): string {
  if (value?.stale) return value.status === 'complete' ? '上次發布已驗證，檢查已過期' : '執行逾時，請檢查';
  return ({ unknown: '狀態未知', pending: '等待下次發布', running: '發布中', complete: '上次發布已驗證', failed: '發布失敗' })[value?.status || 'unknown'];
}
export function PublicationStatus() {
  const [value, setValue] = useState<Status | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => getPublicationStatus().then(result => { if (active) setValue(result); }).catch(() => { if (active) setValue(null); });
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <aside aria-label="Pages 發布狀態" className="mx-4 my-3 rounded-md border border-border p-3 text-xs lg:mx-3">
    <p className="font-medium" role="status">Pages · {publicationLabel(value)}</p>
    <p className="mt-1 text-muted-foreground">全站狀態。儲存成功僅代表資料已儲存；新修改等待發布，尚無單筆上線證明。</p>
    {value?.completedAt && <p className="mt-1">發布驗證：{new Date(value.completedAt).toLocaleString()}</p>}
    {value?.checkedAt && <p className="mt-1">最近檢查：{new Date(value.checkedAt).toLocaleString()}</p>}
  </aside>;
}
