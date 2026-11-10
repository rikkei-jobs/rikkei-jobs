import React from 'react';

interface HeaderProps {
  appName: string;
  version: string;
  subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ appName, version, subtitle }) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <h1 className="header-title" data-testid="app-title">
          {appName}
        </h1>
        <span className="app-version-badge" data-testid="app-version">
          {version}
        </span>
      </div>
      <p className="header-subtitle">{subtitle}</p>
    </header>
  );
};
