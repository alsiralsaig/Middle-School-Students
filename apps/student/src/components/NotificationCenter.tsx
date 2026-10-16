import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Video, BookOpen, Award, AlertCircle, X, ExternalLink } from 'lucide-react';
import { NotificationItem, ViewMode } from '../types';
import { INITIAL_NOTIFICATIONS } from '../data/platformFeaturesData';
import { useLanguage } from '../context/LanguageContext';
import { onNotificationsChanged } from '../utils/toastBus';

interface NotificationCenterProps {
  onNavigate: (view: ViewMode) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const { t, language, isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('sudanese_platform_notifications');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // إعادة قراءة الإشعارات عند إضافة تنبيه جديد من أي مكان في التطبيق
  useEffect(() => {
    const reload = () => {
      try {
        const saved = localStorage.getItem('sudanese_platform_notifications');
        if (saved) setNotifications(JSON.parse(saved));
      } catch {
        /* تجاهل */
      }
    };
    return onNotificationsChanged(reload);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sudanese_platform_notifications', JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    setIsOpen(false);
    if (item.targetView) {
      onNavigate(item.targetView);
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'live':
        return <Video className="w-4 h-4 text-emerald-400" />;
      case 'badge':
        return <Award className="w-4 h-4 text-amber-400" />;
      case 'exam':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-[#162D4A] hover:bg-[#1E3A60] text-slate-300 hover:text-white border border-[#224570] transition-colors cursor-pointer"
        title={t('notifications')}
        aria-label={t('notifications')}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute ${
            isRtl ? 'left-0 sm:left-auto sm:right-0' : 'right-0 sm:right-auto sm:left-0'
          } mt-2 w-80 sm:w-96 bg-[#0B1E36] border border-[#1E3A60] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="p-4 bg-[#08172B] border-b border-[#1E3A60] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">{t('notifications')}</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} جديد
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t('markAllAsRead')}</span>
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-[#173050] bg-[#0A1A30] text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0E2440]/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('all')} ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`flex-1 py-2 font-medium transition-colors ${
                activeTab === 'unread'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0E2440]/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              غير مقروءة ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#152B47]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p>{t('noNotifications')}</p>
              </div>
            ) : (
              filteredNotifications.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 hover:bg-[#122A4A] transition-colors cursor-pointer flex gap-3 relative group ${
                    !item.isRead ? 'bg-[#0E2442]/70' : 'bg-transparent'
                  }`}
                >
                  {/* Icon badge */}
                  <div className="w-8 h-8 rounded-lg bg-[#071728] border border-[#1A385C] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    {getIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs font-bold truncate ${
                          !item.isRead ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {language === 'en' ? item.titleEn : item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {language === 'en' ? item.messageEn : item.message}
                    </p>

                    {item.targetView && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <span>انقر للانتقال</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={e => handleDismiss(e, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity self-start"
                    title="حذف"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {!item.isRead && (
                    <div className="absolute top-4 left-2 w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
