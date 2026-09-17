import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

export const ResumePin = Node.create({
  name: 'resumePin',
  group: 'block',
  atom: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="resume-pin"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'resume-pin' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResumePinComponent)
  },
})

const ResumePinComponent = (props) => {
  return (
    <NodeViewWrapper className="resume-pin">
      <div className="flex items-center space-x-2 p-3 my-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-amber-800 dark:text-amber-300 select-none">
        <span className="text-xl">📍</span>
        <div className="flex-1">
          <strong className="block text-sm">Where I Left Off</strong>
          <span className="text-xs opacity-80">Resume from this point to continue your thought process.</span>
        </div>
      </div>
    </NodeViewWrapper>
  )
}
