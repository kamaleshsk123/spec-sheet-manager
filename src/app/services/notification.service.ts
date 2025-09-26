import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface ConfirmDialog {
  id: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private confirmDialogs$ = new BehaviorSubject<ConfirmDialog[]>([]);

  notifications = this.notifications$.asObservable();
  confirmDialogs = this.confirmDialogs$.asObservable();

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Notification methods
  success(title: string, message?: string, duration: number = 5000): void {
    this.addNotification({
      type: 'success',
      title,
      message,
      duration
    });
  }

  error(title: string, message?: string, duration: number = 8000): void {
    this.addNotification({
      type: 'error',
      title,
      message,
      duration
    });
  }

  warning(title: string, message?: string, duration: number = 6000): void {
    this.addNotification({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  info(title: string, message?: string, duration: number = 5000): void {
    this.addNotification({
      type: 'info',
      title,
      message,
      duration
    });
  }

  private addNotification(notification: Omit<Notification, 'id'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId()
    };

    const current = this.notifications$.value;
    this.notifications$.next([...current, newNotification]);

    // Auto-remove after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, notification.duration);
    }
  }

  removeNotification(id: string): void {
    const current = this.notifications$.value;
    this.notifications$.next(current.filter(n => n.id !== id));
  }

  // Confirmation dialog methods
  confirm(
    title: string,
    message: string,
    options: {
      confirmText?: string;
      cancelText?: string;
      type?: 'danger' | 'warning' | 'info';
    } = {}
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const dialog: ConfirmDialog = {
        id: this.generateId(),
        title,
        message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'info',
        onConfirm: () => {
          this.removeConfirmDialog(dialog.id);
          resolve(true);
        },
        onCancel: () => {
          this.removeConfirmDialog(dialog.id);
          resolve(false);
        }
      };

      const current = this.confirmDialogs$.value;
      this.confirmDialogs$.next([...current, dialog]);
    });
  }

  private removeConfirmDialog(id: string): void {
    const current = this.confirmDialogs$.value;
    this.confirmDialogs$.next(current.filter(d => d.id !== id));
  }

  // Clear all
  clearAll(): void {
    this.notifications$.next([]);
    this.confirmDialogs$.next([]);
  }
}