export interface HtmlReadableEditor {
  isDestroyed: boolean;
  schema: unknown | null;
  getHTML(): string;
}

export function getEditorHtmlOrNull(
  editor: HtmlReadableEditor | null | undefined,
): string | null {
  if (!editor || editor.isDestroyed || !editor.schema) return null;
  return editor.getHTML();
}
