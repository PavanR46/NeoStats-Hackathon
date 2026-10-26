'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinProjectRoom: (projectId: string) => void;
  leaveProjectRoom: (projectId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinProjectRoom: () => {},
  leaveProjectRoom: () => {},
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children, user }: { children: React.ReactNode; user: any }) {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const socket = getSocket();

  useEffect(() => {
    if (!user) {
      if (socket.connected) socket.disconnect();
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    // Real-time Event Listeners
    function onTaskCreated(data: any) {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
    }

    function onTaskUpdated(data: any) {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
    }

    function onTaskDeleted(data: any) {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
    }

    function onCommentCreated(data: any) {
      queryClient.invalidateQueries({ queryKey: ['comments', data.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
    }

    function onMemberAdded(data: any) {
      queryClient.invalidateQueries({ queryKey: ['members', data.projectId] });
    }

    function onNotificationNew(data: any) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('comment:created', onCommentCreated);
    socket.on('member:added', onMemberAdded);
    socket.on('notification:new', onNotificationNew);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('comment:created', onCommentCreated);
      socket.off('member:added', onMemberAdded);
      socket.off('notification:new', onNotificationNew);
    };
  }, [user, queryClient]);

  const joinProjectRoom = (projectId: string) => {
    if (socket && isConnected) {
      socket.emit('join_project', { projectId });
    }
  };

  const leaveProjectRoom = (projectId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_project', { projectId });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinProjectRoom, leaveProjectRoom }}>
      {children}
    </SocketContext.Provider>
  );
}
