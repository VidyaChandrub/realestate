import { useEffect, useRef } from 'react';
import { Bold, Italic, Link, List, ListOrdered, RemoveFormatting, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeJobDescriptionHtml } from '@/lib/jobDescriptionHtml';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const toolbarActions = [
  { command: 'bold', label: 'Bold', icon: Bold },
  { command: 'italic', label: 'Italic', icon: Italic },
  { command: 'underline', label: 'Underline', icon: Underline },
  { command: 'insertUnorderedList', label: 'Bullet list', icon: List },
  { command: 'insertOrderedList', label: 'Numbered list', icon: ListOrdered },
];

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const sanitizedValue = sanitizeJobDescriptionHtml(value);
    if (editor.innerHTML !== sanitizedValue) {
      editor.innerHTML = sanitizedValue;
    }
  }, [value]);

  const syncValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(sanitizeJobDescriptionHtml(editor.innerHTML));
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncValue();
  };

  const addLink = () => {
    const href = window.prompt('Enter a URL');
    if (!href) return;
    runCommand('createLink', href.trim());
  };

  const clearFormatting = () => {
    runCommand('removeFormat');
  };

  return (
    <div className={cn('rounded-md border border-input bg-background', className)}>
      <div className="flex flex-wrap gap-1 border-b bg-muted/30 p-1">
        {toolbarActions.map(({ command, label, icon: Icon }) => (
          <Button
            key={command}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={label}
            aria-label={label}
            onClick={() => runCommand(command)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Add link"
          aria-label="Add link"
          onClick={addLink}
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Clear formatting"
          aria-label="Clear formatting"
          onClick={clearFormatting}
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        contentEditable
        suppressContentEditableWarning
        className="rich-text-editor min-h-[180px] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onInput={syncValue}
        onBlur={syncValue}
        onPaste={(event) => {
          event.preventDefault();
          const html = event.clipboardData.getData('text/html');
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertHTML', false, sanitizeJobDescriptionHtml(html || text));
          syncValue();
        }}
      />
    </div>
  );
}
