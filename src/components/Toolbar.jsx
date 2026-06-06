import { useState } from 'react';
import './Toolbar.scss';

export default function Toolbar({ onDownload, onReset, onRandomize, onCopyLink, busy }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="icm-Bar">
      <button
        type="button"
        className="icm-Bar_Button icm-Bar_Button-primary"
        onClick={onDownload}
        disabled={busy}
      >
        {busy ? 'Exporting…' : 'Download PNG'}
      </button>
      <button type="button" className="icm-Bar_Button" onClick={onRandomize}>
        Randomize
      </button>
      <button type="button" className="icm-Bar_Button" onClick={onReset}>
        Reset
      </button>
      <button type="button" className="icm-Bar_Button" onClick={copy}>
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
