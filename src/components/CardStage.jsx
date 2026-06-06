import { forwardRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';
import './CardStage.scss';

function selectedOptionIds(cat, selections) {
  const val = selections[cat.id];
  if (cat.select === 'multi') return Array.isArray(val) ? val : [];
  return val ? [val] : [];
}

const CardStage = forwardRef(function CardStage({ manifest, selections, text, scale }, ref) {
  return (
    <div className="icm-Stage" ref={ref}>
      {manifest.categories.map((cat, i) =>
        selectedOptionIds(cat, selections).map((id) => {
          const opt = cat.options.find((o) => o.id === id);
          if (!opt) return null;
          return (
            <img
              key={`${cat.id}:${id}`}
              className="icm-Stage_Layer"
              src={opt.src}
              alt=""
              style={{ zIndex: 10 + i }}
            />
          );
        })
      )}
      {manifest.textFields.map((f) => {
        const value = (text[f.id] ?? '').trim();
        if (!value) return null;
        return (
          <span
            key={f.id}
            className={`icm-Stage_Text icm-Stage_Text-${f.id}`}
            style={{
              left: `${(f.x / CANVAS_WIDTH) * 100}%`,
              top: `${(f.y / CANVAS_HEIGHT) * 100}%`,
              fontSize: `${f.fontSize * scale}px`,
              textAlign: f.align || 'left',
            }}
          >
            {value}
          </span>
        );
      })}
    </div>
  );
});

export default CardStage;
