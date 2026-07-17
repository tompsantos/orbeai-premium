import { localStore } from "@/lib/storage/localStore";
import { mockUser, mockWorkspace } from "@/lib/mock/data";

/** Future Phase 1: replace with /me + /me/workspace via ApiClient. */
export const meService = {
  async getUser() {
    localStore.ensureSeeded();
    return mockUser;
  },
  async getWorkspace() {
    return mockWorkspace;
  },
};
