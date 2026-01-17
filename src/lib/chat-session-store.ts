type ChatSessionRecord = {
  did: string;
  handle: string;
  pdsEndpoint: string;
  accessJwt: string;
  refreshJwt?: string;
  updatedAt: number;
};

const chatSessionStore = new Map<string, ChatSessionRecord>();

export function saveChatSession(record: ChatSessionRecord) {
  chatSessionStore.set(record.did, { ...record, updatedAt: Date.now() });
}

export function getChatSession(did: string): ChatSessionRecord | undefined {
  return chatSessionStore.get(did);
}

export function updateChatSession(did: string, updates: Partial<ChatSessionRecord>) {
  const current = chatSessionStore.get(did);
  if (!current) return;
  chatSessionStore.set(did, { ...current, ...updates, updatedAt: Date.now() });
}

export function removeChatSession(did: string) {
  chatSessionStore.delete(did);
}
