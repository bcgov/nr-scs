import type { FC } from 'react';

interface Props {
  message: string;
}

const PlaceholderTab: FC<Props> = ({ message }) => {
  return <div className="scs__tab-view__panel scs__tab-view__panel--placeholder">{message}</div>;
};

export default PlaceholderTab;

