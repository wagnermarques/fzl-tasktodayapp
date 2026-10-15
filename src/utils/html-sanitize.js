import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'a', 'br', 'p', 'div', 'span']
const ALLOWED_ATTR = ['href']

DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer')
    node.setAttribute('target', '_blank')
  }
})

/**
 * Sanitiza HTML gerado pelo rich-text-editor antes de salvar ou renderizar,
 * restringindo a um conjunto mínimo de tags de formatação (RF01/RF06).
 */
export class DescriptionSanitizer {
  static sanitize(html) {
    return DOMPurify.sanitize(html || '', { ALLOWED_TAGS, ALLOWED_ATTR })
  }
}
