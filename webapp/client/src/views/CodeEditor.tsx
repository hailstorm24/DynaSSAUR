import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { keymap, Decoration, type DecorationSet } from '@codemirror/view';
import { python } from '@codemirror/lang-python';
import { Compartment, Prec, StateField, StateEffect } from '@codemirror/state';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { useThemeStore } from '../stores/themeStore.ts';

interface CodeEditorProps {
  initialValue: string;
  onUpdate: (value: string) => void;
  onRun?: () => void;
  errorLine?: number | null;
}

const themeCompartment = new Compartment();

// Error line highlighting — module-level definitions, per-view state.
const setErrorLineEffect = StateEffect.define<number | null>();

const errorDecoField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setErrorLineEffect)) {
        if (e.value === null) return Decoration.none;
        try {
          const line = tr.state.doc.line(e.value);
          return Decoration.set([
            Decoration.line({ class: 'cm-error-line' }).range(line.from),
          ]);
        } catch {
          return Decoration.none;
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const errorLineTheme = EditorView.baseTheme({
  '.cm-error-line': {
    backgroundColor: 'rgba(255, 107, 107, 0.18) !important',
    borderLeft: '3px solid #ff6b6b',
  },
});

export function CodeEditor({ initialValue, onUpdate, onRun, errorLine }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onUpdate(update.state.doc.toString());
      }
    });

    const shiftEnterKeymap = Prec.highest(
      keymap.of([
        {
          key: 'Shift-Enter',
          run: () => {
            onRunRef.current?.();
            return true;
          },
        },
      ]),
    );

    const view = new EditorView({
      doc: initialValue,
      extensions: [
        basicSetup,
        python(),
        themeCompartment.of(isDark ? githubDark : githubLight),
        errorDecoField,
        errorLineTheme,
        updateListener,
        shiftEnterKeymap,
      ],
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // initialValue and onUpdate are intentionally excluded — we only init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: themeCompartment.reconfigure(isDark ? githubDark : githubLight),
    });
  }, [isDark]);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: setErrorLineEffect.of(errorLine ?? null),
    });
  }, [errorLine]);

  return <div ref={containerRef} style={{ fontSize: '14px' }} />;
}
