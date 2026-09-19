import { Node } from '@tiptap/core';

export const Iframe = Node.create({
  name: 'iframe',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      allowFullscreen: true,
      HTMLAttributes: {
        class: 'w-full h-[600px] border border-[var(--color-glass-border)] rounded-xl shadow-lg my-6 bg-[var(--color-bg-panel)]',
      },
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      frameborder: {
        default: 0,
      },
      allowfullscreen: {
        default: this.options.allowFullscreen,
        parseHTML: () => this.options.allowFullscreen,
      },
    }
  },

  parseHTML() {
    return [{
      tag: 'iframe',
    }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'iframe', class: 'relative w-full' }, ['iframe', { ...this.options.HTMLAttributes, ...HTMLAttributes }]]
  },

  addCommands() {
    return {
      setIframe: (options) => ({ tr, dispatch }) => {
        const { selection } = tr
        const node = this.type.create(options)

        if (dispatch) {
          tr.replaceRangeWith(selection.from, selection.to, node)
        }

        return true
      },
    }
  },
})
