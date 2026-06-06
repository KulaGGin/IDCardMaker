import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useManifest } from './hooks/useManifest.js';
import { useCardState } from './hooks/useCardState.js';
import CardStage from './components/CardStage.jsx';
import LayerPicker from './components/LayerPicker.jsx';
import TextFieldsPanel from './components/TextFieldsPanel.jsx';
import Toolbar from './components/Toolbar.jsx';
import { downloadCard } from './utils/exportImage.js';
import { CANVAS_WIDTH } from './utils/constants.js';
import './App.scss';

export default function App() {
  const { manifest, loading, error } = useManifest();
  if (loading) return <div className="icm-App_State">Loading…</div>;
  if (error) return <div className="icm-App_State">Failed to load manifest: {String(error)}</div>;
  return <Editor manifest={manifest} />;
}

function Editor({ manifest }) {
  const card = useCardState(manifest);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(0.2);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;
    const update = () => setScale(node.clientWidth / CANVAS_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const onDownload = useCallback(async () => {
    if (!stageRef.current) return;
    setBusy(true);
    try {
      await downloadCard({
        node: stageRef.current,
        manifest,
        selections: card.selections,
        text: card.text,
        filename: card.text.name || 'id-card',
      });
    } finally {
      setBusy(false);
    }
  }, [manifest, card.selections, card.text]);

  const onCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="icm-App">
      <header className="icm-App_Header">
        <h1 className="icm-App_Title">ID-Card Maker</h1>
      </header>
      <main className="icm-App_Main">
        <aside className="icm-App_Sidebar">
          <TextFieldsPanel manifest={manifest} text={card.text} onText={card.setText} />
          <LayerPicker
            manifest={manifest}
            selections={card.selections}
            onSingle={card.setSingle}
            onClearSingle={card.clearSingle}
            onToggleMulti={card.toggleMulti}
          />
        </aside>
        <section className="icm-App_Preview">
          <div className="icm-App_Card">
            <CardStage
              ref={stageRef}
              manifest={manifest}
              selections={card.selections}
              text={card.text}
              scale={scale}
            />
          </div>
          <Toolbar
            onDownload={onDownload}
            onReset={card.reset}
            onRandomize={card.randomize}
            onCopyLink={onCopyLink}
            busy={busy}
          />
        </section>
      </main>
    </div>
  );
}
