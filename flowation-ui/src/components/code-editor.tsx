import { useRef, useEffect, useCallback } from 'react'
import { EditorView, keymap, placeholder as phExtension } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from 'codemirror'
import { defaultKeymap } from '@codemirror/commands'

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: 'json' | 'sql'
  placeholder?: string
  className?: string
  readOnly?: boolean
  minHeight?: string
}

export function CodeEditor({
  value,
  onChange,
  language = 'json',
  placeholder = '',
  className,
  readOnly = false,
  minHeight = '120px',
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const getLanguageExtension = useCallback(() => {
    switch (language) {
      case 'sql':
        return sql()
      case 'json':
      default:
        return json()
    }
  }, [language])

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        keymap.of(defaultKeymap),
        getLanguageExtension(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString())
          }
        }),
        EditorView.theme({
          '&': { minHeight },
          '.cm-scroller': { overflow: 'auto' },
        }),
        ...(placeholder ? [phExtension(placeholder)] : []),
        ...(readOnly ? [EditorState.readOnly.of(true)] : []),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly])

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}
    />
  )
}
