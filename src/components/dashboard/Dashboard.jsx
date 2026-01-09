import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserScripts, createScript } from "../../lib/db";
import { Plus, FileText, Loader2, Clock } from "lucide-react";

export default function Dashboard({ onSelectScript }) {
  const { currentUser } = useAuth();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function fetchScripts() {
      if (!currentUser) return;
      try {
        const data = await getUserScripts();
        setScripts(data);
      } catch (error) {
        console.error("Error fetching scripts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchScripts();
  }, [currentUser]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const id = await createScript("New Screenplay");
      // Ideally redirect or select the new script
      onSelectScript({ id, title: "New Screenplay", content: "" }); // Pass full object to avoid fetch
    } catch (error) {
      console.error("Error creating script:", error);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp.toMillis()).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">我的劇本</h1>
            <p className="text-muted-foreground mt-1">
              歡迎回來，{currentUser?.displayName}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            新增劇本
          </button>
        </div>

        {scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-lg text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">還沒有劇本</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mt-1">
              開始創作您的第一個故事吧！所有劇本都會自動儲存在雲端。
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="text-primary hover:underline font-medium"
            >
              立即建立
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scripts.map((script) => (
              <button
                key={script.id}
                onClick={() => onSelectScript(script)}
                className="group flex flex-col items-start p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all text-left"
              >
                <div className="w-full flex items-start justify-between mb-3">
                  <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  {/* Future: More actions dropdown */}
                </div>
                <h3 className="font-semibold text-lg line-clamp-1 w-full group-hover:text-primary transition-colors">
                  {script.title || "Untitled Script"}
                </h3>
                <div className="mt-4 flex items-center text-xs text-muted-foreground w-full gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(script.lastModified)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
