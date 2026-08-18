const ALLOWED_TAG_NAMES = [
  'a',
  'b',
  'blockquote',
  'br',
  'div',
  'em',
  'h2',
  'h3',
  'h4',
  'i',
  'li',
  'ol',
  'p',
  'strong',
  'u',
  'ul',
];

const ALLOWED_TAGS = new Set(ALLOWED_TAG_NAMES);

const BLOCKED_TAGS = new Set(['iframe', 'math', 'meta', 'object', 'script', 'style', 'svg']);
const URL_ATTRIBUTES = new Set(['href']);
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function looksLikeHtml(value: string) {
  const htmlTagNames = [...ALLOWED_TAG_NAMES, ...BLOCKED_TAGS].join('|');
  return new RegExp(`<\\/?(?:${htmlTagNames})(?:\\s|>|/)`, 'i').test(value);
}

function plainTextToHtml(value: string) {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, '<br>'))
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('');
}

function sanitizeNode(node: Node, document: Document) {
  if (node.nodeType === Node.COMMENT_NODE) {
    node.parentNode?.removeChild(node);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    const parent = element.parentNode;
    if (!parent) return;

    if (BLOCKED_TAGS.has(tagName)) {
      parent.removeChild(element);
      return;
    }

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
    return;
  }

  [...element.attributes].forEach((attribute) => {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim();

    if (name.startsWith('on') || name === 'style' || name === 'class' || name === 'id') {
      element.removeAttribute(attribute.name);
      return;
    }

    if (tagName === 'a' && URL_ATTRIBUTES.has(name)) {
      try {
        const url = new URL(value, window.location.origin);
        if (!SAFE_URL_PROTOCOLS.has(url.protocol)) {
          element.removeAttribute(attribute.name);
          return;
        }
      } catch {
        element.removeAttribute(attribute.name);
        return;
      }

      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
      return;
    }

    element.removeAttribute(attribute.name);
  });

  if (tagName === 'a' && !element.getAttribute('href')) {
    const text = document.createTextNode(element.textContent ?? '');
    element.replaceWith(text);
  }
}

export function sanitizeJobDescriptionHtml(value: string | null | undefined) {
  const source = (value ?? '').trim();
  if (!source) return '';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return looksLikeHtml(source) ? escapeHtml(source) : plainTextToHtml(source);
  }

  const html = looksLikeHtml(source) ? source : plainTextToHtml(source);
  const sanitizerDocument = document.implementation.createHTMLDocument('');
  const template = sanitizerDocument.createElement('template');
  template.innerHTML = html;

  let currentNode = template.content.firstChild;
  while (currentNode) {
    const nextNode = currentNode.nextSibling;
    sanitizeNode(currentNode, sanitizerDocument);
    currentNode = nextNode;
  }

  const walker = sanitizerDocument.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  const nodes: Node[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => sanitizeNode(node, sanitizerDocument));

  return template.innerHTML.trim();
}

export function getJobDescriptionText(value: string | null | undefined) {
  const sanitizedHtml = sanitizeJobDescriptionHtml(value);
  if (!sanitizedHtml) return '';

  return sanitizedHtml
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
