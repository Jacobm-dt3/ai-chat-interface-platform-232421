import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

/**
 * PUBLIC_INTERFACE
 * Render a single message with role styles and markdown (GFM + code blocks).
 */
export default function MessageItem({ message }) {
  const role = message?.role || 'assistant';
  const isUser = role === 'user';

  return (
    <div className="msg-row" role="listitem" aria-label={`${role} message`}>
      <div className={`avatar ${isUser ? 'user' : 'assistant'}`} aria-hidden="true">
        {isUser ? 'You' : 'AI'}
      </div>

      <div className="msg-bubble">
        <div className="msg-header">
          <div className="msg-role">{role}</div>
        </div>

        <div className="msg-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
            }}
          >
            {message?.content || ''}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
