import './TextFieldsPanel.scss';

export default function TextFieldsPanel({ manifest, text, onText }) {
  return (
    <div className="icm-Fields">
      {manifest.textFields.map((f) => (
        <label className="icm-Fields_Row" key={f.id}>
          <span className="icm-Fields_Label">{f.label}</span>
          <input
            className="icm-Fields_Input"
            type="text"
            value={text[f.id] ?? ''}
            maxLength={f.maxLength}
            placeholder={f.label}
            onChange={(e) => onText(f.id, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
