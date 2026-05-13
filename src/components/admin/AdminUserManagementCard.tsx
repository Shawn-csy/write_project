import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getAdminUsers, addAdminUser, removeAdminUser } from "../../lib/api/admin";

interface AdminUserRow {
  id: string;
  email?: string;
  userId?: string;
  createdAt?: string | number | null;
}

interface ErrorWithMessage {
  message?: string;
}

export function AdminUserManagementCard() {
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [adminEmailInput, setAdminEmailInput] = useState<string>("");
  const [adminManageError, setAdminManageError] = useState<string>("");
  const [isAdminManaging, setIsAdminManaging] = useState<boolean>(false);

  const loadAdminUsers = async (): Promise<void> => {
    try {
      const rows = await getAdminUsers() as AdminUserRow[];
      setAdminUsers(rows || []);
    } catch (error: unknown) {
      console.error("Failed to load admin users", error);
    }
  };

  useEffect(() => { loadAdminUsers(); }, []);

  const handleAddAdmin = async () => {
    const email = adminEmailInput.trim().toLowerCase();
    if (!email) return;
    setIsAdminManaging(true);
    setAdminManageError("");
    try {
      await addAdminUser({ email });
      setAdminEmailInput("");
      await loadAdminUsers();
    } catch (error: unknown) {
      const typedError = error as ErrorWithMessage;
      setAdminManageError(typedError.message || "新增超管失敗");
    } finally {
      setIsAdminManaging(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string): Promise<void> => {
    if (!adminId) return;
    setIsAdminManaging(true);
    setAdminManageError("");
    try {
      await removeAdminUser(adminId);
      await loadAdminUsers();
    } catch (error: unknown) {
      const typedError = error as ErrorWithMessage;
      setAdminManageError(typedError.message || "移除超管失敗");
    } finally {
      setIsAdminManaging(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="輸入要新增的超管 email"
          value={adminEmailInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminEmailInput(e.target.value)}
        />
        <Button onClick={handleAddAdmin} disabled={!adminEmailInput.trim() || isAdminManaging}>
          新增超管
        </Button>
      </div>
      {adminManageError && <div className="text-xs text-destructive">{adminManageError}</div>}
      <div className="space-y-2">
        {(adminUsers || []).map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{item.email || item.userId || item.id}</div>
              <div className="text-xs text-muted-foreground">
                {item.id.startsWith("env-email:")
                  ? "來自環境變數（不可在此移除）"
                  : `建立時間：${item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}`}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isAdminManaging || item.id.startsWith("env-email:")}
              onClick={() => handleRemoveAdmin(item.id)}
            >
              移除
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
