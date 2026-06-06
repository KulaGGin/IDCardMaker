import './LayerPicker.scss';

export default function LayerPicker({ manifest, selections, onSingle, onClearSingle, onToggleMulti }) {
  return (
    <div className="icm-Picker">
      {manifest.categories
        .filter((cat) => !cat.fixed)
        .map((cat) => {
          const val = selections[cat.id];
          return (
            <section className="icm-Picker_Group" key={cat.id}>
              <h3 className="icm-Picker_Title">{cat.label}</h3>
              <div className="icm-Picker_Options">
                {cat.select === 'single' && !cat.required && (
                  <button
                    type="button"
                    className={`icm-Picker_Option icm-Picker_Option-none${
                      val == null ? ' icm-Picker_Option-selected' : ''
                    }`}
                    onClick={() => onClearSingle(cat.id)}
                  >
                    None
                  </button>
                )}
                {cat.options.map((opt) => {
                  const active =
                    cat.select === 'multi'
                      ? Array.isArray(val) && val.includes(opt.id)
                      : val === opt.id;
                  const onClick =
                    cat.select === 'multi'
                      ? () => onToggleMulti(cat.id, opt.id)
                      : () => onSingle(cat.id, opt.id);
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      className={`icm-Picker_Option${active ? ' icm-Picker_Option-selected' : ''}`}
                      onClick={onClick}
                      title={opt.id}
                      aria-pressed={active}
                    >
                      <img className="icm-Picker_Thumb" src={opt.thumb} alt={opt.id} loading="lazy" />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
    </div>
  );
}
