import React, { type PropsWithChildren } from 'react';

const Context = React.createContext<{ groupId: string } | null>(null);

interface Props extends PropsWithChildren {
  id: string;
}

function BottomSheetManagerProviderComp({ id, children }: Props) {
  return (
    <Context.Provider key={id} value={{ groupId: id }}>
      {children}
    </Context.Provider>
  );
}

export const BottomSheetManagerProvider = React.memo(
  BottomSheetManagerProviderComp,
);

export const useBottomSheetManagerContext = () => {
  const context = React.useContext(Context);

  if (!context) {
    throw new Error(
      'useBottomSheetManagerContext must be used within a BottomSheetManagerProvider',
    );
  }
  return context;
};

export const useMaybeBottomSheetManagerContext = () => {
  const context = React.useContext(Context);

  if (!context) {
    return null;
  }
  return context;
};
