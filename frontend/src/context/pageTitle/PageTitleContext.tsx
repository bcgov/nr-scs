import { createContext } from 'react';

export type PageTitleContextData = {
  pageTitle: string;
  setPageTitle: () => void;
};

export const PageTitleContext = createContext<PageTitleContextData | undefined>(undefined);
