import React, { useState } from "react";
import { Shield, Bell, Cpu, User, Check, AlertTriangle, Sparkles } from "lucide-react";
import { User as UserType, NotificationLog } from "../types";

interface NavbarProps {
  user: UserType | null;
  notifications: NotificationLog[];
  onMarkNotificationsRead: () => void;
  onLogout: () => void;
}

export default function Navbar({ user, notifications, onMarkNotificationsRead, onLogout }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/5 bg-slate-950/20 px-6 backdrop-blur-xl">
      {/* Brand Logo and Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 p-2 text-slate-900 shadow-lg shadow-cyan-500/20 border border-white/10">
          <Shield className="h-6 w-6 text-slate-950 font-bold" />
        </div>
        <div>
          <span className="text-lg font-display font-bold tracking-tight text-white bg-clip-text">CivicMind AI</span>
          <span className="ml-2 hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 sm:inline-block font-mono">
            Decision Support v1.0
          </span>
        </div>
      </div>

      {/* GPU / Profile / Notifications Actions */}
      <div className="flex items-center gap-4">
        {/* NVIDIA Stack Acceleration Status */}
        <div className="hidden items-center gap-2 rounded-lg border border-white/5 bg-slate-950/30 px-3 py-1.5 text-xs text-slate-400 lg:flex backdrop-blur-md">
          <Cpu className="h-4 w-4 text-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-300 font-display">GPU System:</span>
          <span className="text-emerald-400 font-mono">cuDF Enabled</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        {/* Notifications Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className="relative rounded-lg border border-white/5 bg-slate-950/30 p-2 text-slate-300 hover:bg-white/[0.05] hover:text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#080d19]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl glass-dropdown p-4 z-50">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-display font-semibold text-white">System Alerts</span>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkNotificationsRead}
                    className="text-xs font-medium text-cyan-400 hover:underline cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">No active notifications</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`rounded-lg p-2.5 text-xs border transition-all ${
                        notif.read ? "bg-white/[0.01] border-white/5" : "bg-white/[0.03] border-white/10 shadow"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {notif.type === "Threshold_Alert" ? (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : notif.type === "AI_Recommendation" ? (
                          <Sparkles className="mt-0.5 h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        ) : (
                          <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-200 truncate">{notif.title}</p>
                          <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">{notif.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-950/30 p-1.5 pr-3 hover:bg-white/[0.05] transition-all cursor-pointer backdrop-blur-md"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs uppercase shadow-sm">
              {user ? user.name.slice(0, 2) : <User className="h-4 w-4 text-slate-950" />}
            </div>
            {user && (
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                <p className="text-[10px] text-slate-400 leading-none">{user.role}</p>
              </div>
            )}
          </button>

          {showProfile && user && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl glass-dropdown p-4 z-50">
              <div className="border-b border-white/5 pb-3">
                <p className="text-sm font-display font-semibold text-white">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                <div className="mt-2 rounded bg-slate-950/50 px-2 py-1 text-[10px] text-slate-400 border border-white/5">
                  <span className="font-semibold text-slate-300">Dept:</span> {user.department}
                </div>
              </div>
              <div className="pt-3">
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display">Multitenancy Context</p>
                  <p className="text-xs font-semibold text-slate-300 mt-1">{user.organization.name}</p>
                  <p className="text-[11px] text-slate-500">{user.organization.region}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full rounded-lg bg-red-500/10 border border-red-500/20 py-1.5 text-center text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                >
                  Logout Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
