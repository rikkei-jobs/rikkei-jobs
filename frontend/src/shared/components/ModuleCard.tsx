import React from 'react';

export interface ModuleItem {
  id: string;
  name: string;
  code: string;
  description: string;
  roleTarget: string;
  badge: string;
}

interface ModuleCardProps {
  module: ModuleItem;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ module }) => {
  return (
    <article className="module-card" data-testid={`module-${module.id}`}>
      <div className="module-card-header">
        <span className="module-code">{module.code}</span>
        <span className="module-badge">{module.badge}</span>
      </div>
      <h3 className="module-name">{module.name}</h3>
      <p className="module-desc">{module.description}</p>
      <div className="module-target">
        <span className="target-label">Đối tượng:</span> {module.roleTarget}
      </div>
    </article>
  );
};
