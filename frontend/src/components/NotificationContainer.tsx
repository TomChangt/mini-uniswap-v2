import React, { useEffect, useState } from "react";
import { useNotification, Notification } from "../contexts/NotificationContext";

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRemove,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 进入动画
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📢";
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case "success":
        return "border-green-400 bg-gradient-to-r from-green-400/20 to-emerald-400/20";
      case "error":
        return "border-red-400 bg-gradient-to-r from-red-400/20 to-pink-400/20";
      case "warning":
        return "border-yellow-400 bg-gradient-to-r from-yellow-400/20 to-orange-400/20";
      case "info":
        return "border-blue-400 bg-gradient-to-r from-blue-400/20 to-cyan-400/20";
      default:
        return "border-gray-400 bg-gradient-to-r from-gray-400/20 to-slate-400/20";
    }
  };

  const getProgressBarColor = () => {
    switch (notification.type) {
      case "success":
        return "bg-gradient-to-r from-green-400 to-emerald-400";
      case "error":
        return "bg-gradient-to-r from-red-400 to-pink-400";
      case "warning":
        return "bg-gradient-to-r from-yellow-400 to-orange-400";
      case "info":
        return "bg-gradient-to-r from-blue-400 to-cyan-400";
      default:
        return "bg-gradient-to-r from-gray-400 to-slate-400";
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border-2 backdrop-filter backdrop-blur-lg
        transform transition-all duration-300 ease-out
        ${getColorClasses()}
        ${
          isVisible && !isLeaving
            ? "translate-x-0 opacity-100 scale-100"
            : isLeaving
            ? "translate-x-full opacity-0 scale-95"
            : "translate-x-full opacity-0 scale-95"
        }
        hover:scale-105 hover:shadow-2xl
        min-w-[320px] max-w-[400px]
      `}
    >
      {/* 进度条 */}
      <div className="absolute top-0 left-0 right-0 h-1">
        <div
          className={`h-full ${getProgressBarColor()} animate-shrink`}
          style={{
            animation: `shrink ${notification.duration}ms linear forwards`,
          }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* 图标 */}
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <span className="text-2xl">{getIcon()}</span>
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-semibold text-slate-100 mb-1">
              {notification.title}
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {notification.message}
            </p>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                     text-slate-400 hover:text-slate-200 transition-colors duration-200
                     hover:bg-white/10 rounded-full"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>

      {/* 装饰性光效 */}
      <div className="absolute -top-1 -left-1 w-4 h-4 bg-white/20 rounded-full blur-sm animate-pulse" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white/15 rounded-full blur-sm animate-pulse delay-300" />
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem
            notification={notification}
            onRemove={removeNotification}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
