import React from 'react';
import { ShoppingCart, CheckSquare, Square } from 'lucide-react';

interface ChecklistItem {
  id: string;
  item: string;
  category: string;
  quantity: string;
  requiredQuantity: string;
  completed: boolean;
}

interface EmergencyChecklistProps {
  checklist: ChecklistItem[];
  onToggleItem: (itemId: string, completed: boolean, quantity: string) => void;
}

export const EmergencyChecklist: React.FC<EmergencyChecklistProps> = ({ checklist, onToggleItem }) => {
  const completedCount = checklist.filter(x => x.completed).length;
  const totalCount = checklist.length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group items by category
  const categories: Record<string, ChecklistItem[]> = {};
  checklist.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
  });

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart size={20} style={{ color: 'var(--accent-color)' }} />
          Emergency Supplies Tracker
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          {completedCount} of {totalCount} Items Stocked
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', background: 'var(--bg-tertiary)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${percentComplete}%`,
            height: '100%',
            background: 'var(--accent-gradient)',
            transition: 'width 0.3s ease-out'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
        {Object.entries(categories).map(([category, items]) => (
          <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {category} Supplies
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {items.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    opacity: item.completed ? 0.75 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => onToggleItem(item.id, !item.completed, item.quantity)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: item.completed ? 'var(--accent-color)' : 'var(--text-tertiary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0
                      }}
                    >
                      {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: item.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                      textDecoration: item.completed ? 'line-through' : 'none'
                    }}>
                      {item.item}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Editable Quantities */}
                    <input
                      type="text"
                      value={item.quantity}
                      onChange={(e) => onToggleItem(item.id, item.completed, e.target.value)}
                      placeholder="Qty"
                      style={{
                        width: '70px',
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', minWidth: '40px' }}>
                      / {item.requiredQuantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
