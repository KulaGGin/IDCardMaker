import { useRef, useState } from 'react';
import './UploadPack.scss';

export default function UploadPack({ onAddPack, onClear, hasUploads, lastResult }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      await onAddPack(file);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <section className="icm-Upload">
      <h3 className="icm-Upload_Title">Your art (.zip)</h3>
      <div
        className={`icm-Upload_Drop${dragOver ? ' icm-Upload_Drop-over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {busy ? 'Adding…' : 'Drop a .zip here or click to choose'}
        <input
          ref={inputRef}
          className="icm-Upload_Input"
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <p className="icm-Upload_Hint">
        Folders named like the categories (e.g. <code>Face/</code>, <code>Eyes/</code>) with PNGs inside.
      </p>
      {lastResult && (
        <p className="icm-Upload_Status">
          {lastResult.added > 0
            ? `Added ${lastResult.added} option${lastResult.added === 1 ? '' : 's'} across ${lastResult.categories} categor${lastResult.categories === 1 ? 'y' : 'ies'}.`
            : 'No usable images found.'}
          {lastResult.warnings?.length ? ` (${lastResult.warnings.length} skipped)` : ''}
        </p>
      )}
      {hasUploads && (
        <button type="button" className="icm-Upload_Clear" onClick={onClear}>
          Clear my uploads
        </button>
      )}
    </section>
  );
}
