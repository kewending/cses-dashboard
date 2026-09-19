import { mergeAttributes, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import { useState, useCallback } from 'react';

const ResizableImageComponent = (props) => {
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = props.node.attrs.width || props.node.attrs.htmlAttrs?.width || 300;

    const currentWidth = typeof startWidth === 'number' ? startWidth : parseInt(startWidth, 10) || 300;

    const handleMouseMove = (moveEvent) => {
      const diffX = moveEvent.clientX - startX;
      props.updateAttributes({ width: `${Math.max(100, currentWidth + diffX)}px` });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [props]);

  // If no src is provided, don't render an empty broken image
  if (!props.node.attrs.src) {
    return <NodeViewWrapper><span>[Invalid Image]</span></NodeViewWrapper>;
  }

  const nodeWidth = props.node.attrs.width;
  const widthStyle = nodeWidth
    ? (String(nodeWidth).endsWith('%') || String(nodeWidth).endsWith('px') ? nodeWidth : `${nodeWidth}px`)
    : 'auto';

  return (
    <NodeViewWrapper
      className={`resizable-image-wrapper relative inline-block max-w-full ${props.selected ? 'ring-2 ring-[var(--color-accent)]' : ''}`}
      style={{ width: widthStyle }}
    >
      <img
        src={props.node.attrs.src}
        alt={props.node.attrs.alt || ''}
        title={props.node.attrs.title || ''}
        className="block max-w-full rounded-lg shadow-md"
        style={{ width: '100%', height: 'auto' }}
      />

      {/* Drag handle for resizing */}
      {props.editor.isEditable && (
        <div
          className="absolute right-0 bottom-0 w-6 h-6 bg-[var(--color-accent)]/80 text-white rounded-br-lg rounded-tl flex items-center justify-center cursor-nwse-resize opacity-0 hover:opacity-100 transition-opacity z-10"
          onMouseDown={handleMouseDown}
          title="Drag to resize"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
    };
  },

  addInputRules() {
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)$/;
    return [
      nodeInputRule({
        find: markdownImageRegex,
        type: this.type,
        getAttributes: match => {
          const [, alt, src] = match;
          return { src, alt };
        },
      }),
    ];
  },

  addPasteRules() {
    // Tiptap's nodePasteRule is not always exported properly in older versions, 
    // so we rely on tiptap-markdown to handle paste, OR we can add a manual paste rule via plugin.
    // However, if we just define the parent paste rules, Tiptap's URL image paste rule will work.
    return this.parent?.() || [];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
