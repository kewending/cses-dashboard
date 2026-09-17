'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Markdown } from 'tiptap-markdown';
import suggestion from './extensions/suggestion';
import { 
  Undo, Redo, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Bold, Italic, 
  Strikethrough, Code, Underline as UnderlineIcon, 
  Link as LinkIcon, Superscript as SuperscriptIcon, 
  Subscript as SubscriptIcon, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, PlusSquare, Check, X
} from 'lucide-react';

const MenuBar = ({ editor }) => {
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const submitImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setShowImagePrompt(false);
    setImageUrl('');
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-dark)]/50 rounded-t-xl shrink-0 relative">
      <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)] rounded transition-colors disabled:opacity-50">
        <Undo size={16} />
      </button>
      <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)] rounded transition-colors disabled:opacity-50">
        <Redo size={16} />
      </button>
      
      <div className="w-px h-6 bg-[var(--color-glass-border)] mx-1" />

      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <Heading1 size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <Heading2 size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <Heading3 size={16} />
      </button>

      <div className="w-px h-6 bg-[var(--color-glass-border)] mx-1" />

      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <List size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <ListOrdered size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('blockquote') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <Quote size={16} />
      </button>

      <div className="w-px h-6 bg-[var(--color-glass-border)] mx-1" />

      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <Bold size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <Italic size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('strike') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <Strikethrough size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('code') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <Code size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('underline') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <UnderlineIcon size={16} />
      </button>
      <button onClick={setLink} className={`p-1.5 rounded transition-colors ${editor.isActive('link') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <LinkIcon size={16} />
      </button>
      
      <div className="w-px h-6 bg-[var(--color-glass-border)] mx-1" />

      <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('superscript') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <SuperscriptIcon size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('subscript') ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <SubscriptIcon size={16} />
      </button>

      <div className="w-px h-6 bg-[var(--color-glass-border)] mx-1" />

      <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <AlignLeft size={16} />
      </button>
      <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <AlignCenter size={16} />
      </button>
      <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <AlignRight size={16} />
      </button>
      <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}>
        <AlignJustify size={16} />
      </button>

      <div className="w-px h-6 bg-[var(--color-glass-border)] mx-1" />

      <div className="relative">
        <button 
          onClick={() => setShowImagePrompt(!showImagePrompt)} 
          className={`flex items-center gap-1 p-1.5 rounded transition-colors ${showImagePrompt ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel)]'}`}
        >
          <PlusSquare size={16} />
          <span className="text-xs font-medium">Image</span>
        </button>

        {showImagePrompt && (
          <div className="absolute top-full mt-2 right-0 z-[100] bg-[var(--color-bg-panel)] border border-[var(--color-glass-border)] rounded-xl shadow-xl p-3 flex gap-2 w-72 animate-in fade-in slide-in-from-top-2">
            <input 
              autoFocus
              type="text" 
              placeholder="Paste image URL..."
              className="flex-1 min-w-0 bg-[var(--color-bg-dark)] border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)] transition-colors"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitImage()}
            />
            <button onClick={submitImage} className="p-1.5 shrink-0 bg-[var(--color-accent)] text-white rounded-lg hover:brightness-110 transition-all shadow-sm">
              <Check size={16} />
            </button>
            <button onClick={() => {setShowImagePrompt(false); setImageUrl('');}} className="p-1.5 shrink-0 bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-glass-border)] rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SecondBrainEditor({ initialContent, onSave }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Markdown,
      Underline,
      Superscript,
      Subscript,
      Highlight,
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1 rounded-sm font-medium',
        },
        suggestion,
      }),
      Placeholder.configure({
        placeholder: 'Capture your thoughts here...',
      }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm md:prose-base max-w-none text-[var(--color-text-main)] prose-headings:text-[var(--color-text-main)] prose-p:text-[var(--color-text-main)] prose-li:text-[var(--color-text-main)] prose-strong:text-[var(--color-text-main)] prose-a:text-blue-500 prose-a:underline hover:prose-a:text-blue-400 prose-img:rounded-lg prose-img:shadow-md focus:outline-none min-h-[300px] p-4 transition-all duration-500',
      },
    },
    onUpdate: ({ editor }) => {
      onSave?.(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="w-full flex flex-col border border-[var(--color-glass-border)] rounded-xl overflow-hidden bg-[var(--color-bg-dark)] h-full">
      <MenuBar editor={editor} />
      <div className="relative flex-1 bg-transparent overflow-y-auto custom-scrollbar">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
