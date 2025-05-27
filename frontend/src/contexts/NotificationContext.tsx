import React, { createContext, useContext, useState, useCallback } from "react";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newNotification: Notification = {
        ...notification,
        id,
        duration: notification.duration || 4000,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // 自动移除通知
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    },
    [removeNotification]
  );

  const showSuccess = useCallback(
    (title: string, message: string) => {
      addNotification({ type: "success", title, message });
    },
    [addNotification]
  );

  const showError = useCallback(
    (title: string, message: string) => {
      addNotification({ type: "error", title, message });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string) => {
      addNotification({ type: "warning", title, message });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string) => {
      addNotification({ type: "info", title, message });
    },
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
