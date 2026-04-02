import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { keymap } from '@codemirror/view';
import { python } from '@codemirror/lang-python';
import { Compartment, Prec } from '@codemirror/state';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { useThemeStore } from '../stores/themeStore.ts';

interface CodeEditorProps {
  initialValue: string;
  onUpdate: (value: string) => void;
  onRun?: () => void;
}

const themeCompartment = new Compartment();

export function CodeEditor({ initialValue, onUpdate, onRun }: CodeEditorProps) {
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

  return <div ref={containerRef} style={{ fontSize: '14px' }} />;
}
