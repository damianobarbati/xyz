import type { User } from "types/User.ts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AppState = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
};

const STORAGE_KEY = `rsk-storage-${window.location.hostname}`;

export const store = create<AppState>()(
  persist(
    (set, _get) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => {
        set({ user: null });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: (_state) => async (_hydratedState, error) => {
        if (error) console.error(error);
      },
    },
  ),
);

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) store.persist.rehydrate();
});
