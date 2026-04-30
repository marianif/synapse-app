import { EventEmitter, requireNativeModule } from 'expo-modules-core';

// This is the name we defined in WatchConnectivityModule.swift: Name("WatchConnectivity")
const WatchConnectivityModule = requireNativeModule('WatchConnectivity');

export type WatchMessage = {
  [key: string]: any;
};

const emitter = new EventEmitter(WatchConnectivityModule);

export function addWatchMessageListener(listener: (event: WatchMessage) => void) {
  return emitter.addListener('onWatchMessageReceived', listener);
}

export function addWatchContextListener(listener: (event: WatchMessage) => void) {
  return emitter.addListener('onWatchContextReceived', listener);
}

export function addWatchFileListener(listener: (event: { url: string; metadata: WatchMessage }) => void) {
  return emitter.addListener('onWatchFileReceived', listener);
}

export async function updateWatchContext(context: WatchMessage): Promise<void> {
  return await WatchConnectivityModule.updateApplicationContext(context);
}

export async function sendMessage(message: WatchMessage): Promise<WatchMessage> {
  return await WatchConnectivityModule.sendMessage(message);
}

export default WatchConnectivityModule;
