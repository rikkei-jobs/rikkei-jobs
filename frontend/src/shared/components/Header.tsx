import React from 'react';
import { BrandMark } from './BrandMark';

interface HeaderProps {
  appName: string;
  version?: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ appName, version, subtitle, rightSlot }) => {
  return (
    <header className="app-header">
      <div className="header-top-row">
        <div className="header-brand">
          <BrandMark size={32} sharedTransition />
          <h1 className="header-title" data-testid="app-title">
            {appName}
          </h1>
          {version && (
            <span className="app-version-badge" data-testid="app-version">
              {version}
            </span>
          )}
        </div>
        {rightSlot && <div className="header-actions">{rightSlot}</div>}
      </div>
      <p className="header-subtitle">{subtitle}</p>
    </header>
  );
};
