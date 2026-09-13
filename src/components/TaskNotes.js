"use client";

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

export default function TaskNotes({ initialNote, onSave }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({
        placeholder: 'Add a description...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialNote || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none text-gray-700 prose-headings:font-bold prose-headings:text-gray-800 prose-a:text-green-600 hover:prose-a:text-green-500 prose-p:leading-relaxed prose-ul:my-1 prose-li:my-0 pb-4 focus:outline-none min-h-[40px]',
      },
    },
    onBlur: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown();
      if (markdown !== initialNote) {
        onSave(markdown);
      }
    },
  });

  useEffect(() => {
    if (editor && initialNote !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(initialNote || '');
    }
  }, [initialNote, editor]);

  return (
    <div className="w-full relative rounded-md transition-colors hover:bg-gray-50/50 p-2 -ml-2">
      <EditorContent editor={editor} />
    </div>
  );
}
