import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Use the locally-bundled Monaco instead of loading from CDN.
// CDN loading fails over file:// and is blocked by the app's CSP.
loader.config({ monaco });

// Monaco workers cannot be split into separate files in the IIFE bundle.
// Provide a no-op blob: worker so Monaco initialises cleanly.
// Basic YAML editing still works; worker-backed diagnostics are not needed here.
(window as unknown as Record<string, unknown>).MonacoEnvironment = {
  getWorkerUrl(_moduleId: string, _label: string): string {
    return URL.createObjectURL(
      new Blob(['self.onmessage=function(){}'], { type: 'text/javascript' })
    );
  },
};
