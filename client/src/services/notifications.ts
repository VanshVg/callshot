import api from './api';
import type { Notification } from '../types/index';

export const fetchNotifications = async (): Promise<Notification[]> => {
  const { data } = await api.get('/notifications');
  return data.notifications;
};

export const markNotificationsRead = async (): Promise<void> => {
  await api.put('/notifications/read');
};
