import { useState } from 'react';
import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';

interface LivePreviewProps {
  code: string;
}

type Viewport = 'mobile' | 'tablet' | 'desktop';

interface ViewportConfig {
  width: number;
  label: string;
  icon: string;
}

const VIEWPORTS: Record<Viewport, ViewportConfig> = {
  mobile: { width: 375, label: '모바일', icon: '📱' },
  tablet: { width: 768, label: '태블릿', icon: '⊞' },
  desktop: { width: 1024, label: '데스크탑', icon: '🖥️' },
};

export function LivePreview({ code }: LivePreviewProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const viewportConfig = VIEWPORTS[viewport];

  return (
    <div className="preview-panel">
      <div className="panel-header">
        <h3>미리보기</h3>
        <div className="responsive-toolbar">
          {(Object.keys(VIEWPORTS) as Viewport[]).map((vp) => (
            <button
              key={vp}
              className={`viewport-btn ${viewport === vp ? 'viewport-btn--active' : ''}`}
              onClick={() => setViewport(vp)}
              title={VIEWPORTS[vp].label}
              aria-label={VIEWPORTS[vp].label}
            >
              <span className="viewport-icon">{VIEWPORTS[vp].icon}</span>
              <span className="viewport-label">{VIEWPORTS[vp].label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="preview-content">
        <LiveProvider code={code} noInline>
          <div className="preview-viewport-wrapper">
            <div
              className="preview-render"
              style={{
                width: viewport === 'desktop' ? '100%' : `${viewportConfig.width}px`,
                margin: '0 auto',
              }}
            >
              <ReactLivePreview />
            </div>
          </div>
          <LiveError className="preview-error" />
        </LiveProvider>
      </div>
    </div>
  );
}
