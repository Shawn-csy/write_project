import React from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Search, Loader2, Plus } from "lucide-react";
import { useI18n } from "../../contexts/I18nContext";
import type { AdminUser, AdminOrg, AdminPersona, AdminScript } from "../../hooks/useAdminPageState";

interface AdminTransferModalProps {
  selectedItem: AdminOrg | AdminPersona | AdminScript;
  selectedItemLabel: string;
  transferTypeLabel: string;
  targetUser: AdminUser | null;
  setTargetUser: (user: AdminUser | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: AdminUser[];
  isSearching: boolean;
  searchError: string;
  isTransferring: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AdminTransferModal({
  selectedItemLabel,
  transferTypeLabel,
  targetUser,
  setTargetUser,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  searchError,
  isTransferring,
  onCancel,
  onConfirm,
}: AdminTransferModalProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <CardHeader>
          <CardTitle>{t("transferAdmin.modalTitle")}</CardTitle>
          <CardDescription>
            {t("transferAdmin.transferring")}{" "}
            <span className="font-bold text-foreground mx-1">{selectedItemLabel}</span>
            ({transferTypeLabel})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("transferAdmin.searchTargetLabel")}</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("transferAdmin.targetSearchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {searchQuery && (
              <div className="border rounded-md mt-2 max-h-40 overflow-y-auto bg-popover text-popover-foreground shadow-sm">
                {searchError ? (
                  <div className="p-3 text-xs text-destructive text-center">{searchError}</div>
                ) : searchResults.length === 0 && !isSearching ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">{t("transferAdmin.noUsers")}</div>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      className={`p-2 text-sm cursor-pointer hover:bg-muted flex items-center gap-2 ${targetUser?.id === user.id ? "bg-secondary" : ""}`}
                      onClick={() => { setTargetUser(user); setSearchQuery(""); }}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                        {(user.displayName || user.handle || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 truncate">
                        <span className="font-medium">{user.displayName || t("transferAdmin.noNickname")}</span>
                        <span className="text-xs text-muted-foreground ml-2">@{user.handle || user.id.slice(0, 6)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {targetUser && (
            <div className="bg-secondary/30 p-3 rounded-md border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {(targetUser.displayName || targetUser.handle || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{t("transferAdmin.willTransferTo")}：</div>
                  <div className="text-sm">
                    {targetUser.displayName}{" "}
                    <span className="text-xs text-muted-foreground">(@{targetUser.handle})</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setTargetUser(null)}>
                <Plus className="rotate-45" />
              </Button>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onCancel}>{t("transferAdmin.cancel")}</Button>
            <Button onClick={onConfirm} disabled={!targetUser || isTransferring}>
              {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("transferAdmin.confirmTransfer")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
