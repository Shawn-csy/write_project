import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut, User, ChevronDown } from "lucide-react";

export default function UserMenu() {
  const { currentUser, login, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = async () => {
    try {
      await login();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to login", error);
    }
  };

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await logout();
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  if (currentUser) {
    return (
      <div className="relative w-full" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 hover:bg-muted/50 p-2 rounded-lg transition-colors border border-transparent hover:border-border/50 text-left"
        >
          {currentUser.photoURL ? (
            <img 
              src={currentUser.photoURL} 
              alt={currentUser.displayName} 
              className="w-8 h-8 rounded-full border border-border shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border shrink-0">
              <span className="text-xs font-medium">{currentUser.displayName?.[0]}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
              <span className="text-xs font-medium block truncate">
                {currentUser.displayName}
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {currentUser.email}
              </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 bottom-full mb-2 w-full min-w-[200px] rounded-md border border-border bg-popover text-popover-foreground shadow-lg shadow-black/5 outline-none animate-in slide-in-from-bottom-2 z-50 overflow-hidden">
             {/* Logout */}
             <div className="p-1">
              <button 
                onClick={handleLogout}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none text-destructive hover:bg-destructive/10 gap-2 font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>登出 (Log out)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full" ref={menuRef}>
        <div className="flex items-center gap-2">
            <button
            onClick={handleLogin}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md shadow hover:bg-primary/90 transition-colors"
            >
            <User className="w-3.5 h-3.5" />
            登入 / 註冊
            </button>
        </div>
    </div>
  );
}
