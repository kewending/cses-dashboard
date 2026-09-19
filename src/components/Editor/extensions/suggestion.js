import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

const MentionList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = index => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }
      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }
      if (event.key === 'Enter') {
        enterHandler()
        return true
      }
      return false
    },
  }))

  return (
    <div className="bg-[var(--color-bg-panel)] border border-[var(--color-border)] shadow-xl rounded-lg overflow-hidden min-w-[150px]">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={`w-full text-left px-4 py-2 text-sm ${
              index === selectedIndex
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item}
          </button>
        ))
      ) : (
        <div className="px-4 py-2 text-sm text-slate-500">No result</div>
      )}
    </div>
  )
})

export default {
  items: async ({ query }) => {
    try {
      const res = await fetch(`/api/crm/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const contacts = await res.json();
      return contacts.map(c => c.fullName).slice(0, 5);
    } catch (e) {
      console.error('Mention fetch error:', e);
      return [];
    }
  },
  render: () => {
    let component
    let popup

    return {
      onStart: props => {
        component = new ReactRenderer(MentionList, { props, editor: props.editor })
        if (!props.clientRect) return

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },
      onUpdate(props) {
        component.updateProps(props)
        if (!props.clientRect) return
        popup[0].setProps({ getReferenceClientRect: props.clientRect })
      },
      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }
        return component.ref?.onKeyDown(props)
      },
      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
