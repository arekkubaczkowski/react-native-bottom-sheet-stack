import { createContext, useContext, type ReactNode } from 'react';

interface UserContextValue {
  username: string;
  theme: string;
}

const UserContext = createContext<UserContextValue | null>(null);

export function useUser() {
  return useContext(UserContext);
}

interface UserProviderProps {
  children: ReactNode;
  value: UserContextValue;
}

export function UserProvider({ children, value }: UserProviderProps) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
