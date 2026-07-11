import React, { useState, useCallback, useRef, useMemo } from 'react';
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
  // Debounced quantity tracker — avoids an API PUT on every keystroke
  const [localQtys, setLocalQtys] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Memoize derived counts so they don't recompute on every keystroke
  const { completedCount, totalCount, percentComplete } = useMemo(() => {
    const done = checklist.filter(x => x.completed).length;
    const total = checklist.length;
    return {
      completedCount: done,
      totalCount: total,
      percentComplete: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [checklist]);

  // Memoize category grouping — O(n) per render without this
  const categories = useMemo(() => {
    const map: Record<string, ChecklistItem[]> = {};
    for (const item of checklist) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [checklist]);

  const handleQtyChange = useCallback((item: ChecklistItem, value: string) => {
    setLocalQtys(prev => ({ ...prev, [item.id]: value }));
    clearTimeout(debounceTimers.current[item.id]);
    debounceTimers.current[item.id] = setTimeout(() => {
      onToggleItem(item.id, item.completed, value);
    }, 800);
  }, [onToggleItem]);

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart size={20} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
          Emergency Supplies Tracker
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }} aria-live="polite">
          {completedCount} of {totalCount} Items Stocked
        </span>
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percentComplete}% of supplies stocked`}
        style={{ width: '100%', background: 'var(--bg-tertiary)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}
      >
        <div
          style={{
            width: `${percentComplete}%`,
            height: '100%',
            background: 'var(--accent-gradient)',
            transition: 'width 0.3s ease-out',
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
                    opacity: item.completed ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => onToggleItem(item.id, !item.completed, localQtys[item.id] ?? item.quantity)}
                      aria-label={`${item.completed ? 'Unmark' : 'Mark'} ${item.item} as stocked`}
                      aria-pressed={item.completed}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: item.completed ? 'var(--accent-color)' : 'var(--text-tertiary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                    >
                      {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: item.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                      textDecoration: item.completed ? 'line-through' : 'none',
                    }}>
                      {item.item}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={localQtys[item.id] ?? item.quantity}
                      onChange={e => handleQtyChange(item, e.target.value)}
                      placeholder="Qty"
                      aria-label={`Quantity for ${item.item}`}
                      style={{
                        width: '70px',
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
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
