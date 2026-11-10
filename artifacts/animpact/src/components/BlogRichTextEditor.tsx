import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";

export interface BlogRichTextEditorProps {
  value: string;
  onChange(html: string): void;
  onBlur?(): void;
  onUploadImage(file: File): Promise<string>;
  disabled?: boolean;
}

type SavedSelection = { from: number; to: number };

function isSafeHref(value: string) {
  const href = value.trim();
  return /^(https?:|mailto:|tel:|\/|#)/i.test(href);
}

function ToolbarButton({
  label,
  testId,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  testId: string;
  active?: boolean;
  disabled?: boolean;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      data-testid={testId}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground/75 hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function BlogRichTextEditor({
  value,
  onChange,
  onBlur,
  onUploadImage,
  disabled = false,
}: BlogRichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<SavedSelection>({ from: 1, to: 1 });
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "blog-rich-editor-content min-h-56 px-4 py-3 text-sm leading-7 text-foreground outline-none sm:min-h-72 sm:px-5 sm:py-4",
        "aria-label": "Contenu de l’article",
        "data-testid": "editor-blog-content",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    onBlur: () => onBlur?.(),
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== (value || "")) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  function rememberSelection(currentEditor: Editor | null = editor) {
    if (!currentEditor) return;
    selectionRef.current = {
      from: currentEditor.state.selection.from,
      to: currentEditor.state.selection.to,
    };
  }

  function restoreSelection(currentEditor: Editor) {
    const max = currentEditor.state.doc.content.size;
    const from = Math.min(selectionRef.current.from, max);
    const to = Math.min(selectionRef.current.to, max);
    currentEditor.chain().focus().setTextSelection({ from, to }).run();
  }

  function openLinkPanel() {
    if (!editor) return;
    rememberSelection(editor);
    setLinkHref(editor.getAttributes("link").href ?? "");
    setLinkPanelOpen(true);
    setImagePanelOpen(false);
  }

  function applyLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const href = linkHref.trim();
    if (href && !isSafeHref(href)) return;
    const editingExistingLink = editor.isActive("link");
    restoreSelection(editor);
    const chain = editor.chain().extendMarkRange("link");
    if (!href) {
      chain.unsetLink().run();
    } else if (editingExistingLink) {
      chain.setLink({ href }).run();
    } else if (selectionRef.current.from === selectionRef.current.to) {
      chain.insertContent({
        type: "text",
        text: href,
        marks: [{ type: "link", attrs: { href } }],
      }).run();
    } else {
      chain.setLink({ href }).run();
    }
    setLinkPanelOpen(false);
  }

  function openImagePicker() {
    if (!editor) return;
    rememberSelection(editor);
    setLinkPanelOpen(false);
    setImagePanelOpen(false);
    setUploadError("");
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Choisissez un fichier image.");
      setImagePanelOpen(true);
      return;
    }
    setImageFile(file);
    setImageAlt(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    setUploadError("");
    setImagePanelOpen(true);
  }

  async function insertImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !imageFile || uploading) return;
    setUploading(true);
    setUploadError("");
    try {
      const src = await onUploadImage(imageFile);
      if (!src.trim()) throw new Error("L’image n’a pas pu être ajoutée.");
      restoreSelection(editor);
      editor.chain().focus().setImage({ src, alt: imageAlt.trim() }).run();
      setImagePanelOpen(false);
      setImageFile(null);
      setImageAlt("");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Impossible d’ajouter cette image. Réessayez.");
    } finally {
      setUploading(false);
    }
  }

  const selectionHasContent = Boolean(editor && !editor.state.selection.empty);
  const controlDisabled = disabled || !editor;

  return (
    <div
      className={`overflow-hidden rounded-md border border-input bg-background transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 ${
        disabled ? "opacity-70" : ""
      }`}
      data-testid="blog-rich-text-editor"
    >
      <div
        className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-muted/35 px-2 py-2"
        role="toolbar"
        aria-label="Mise en forme du contenu"
        data-testid="toolbar-blog-content"
      >
        <div className="flex items-center gap-0.5 border-r border-border/70 pr-1">
          <ToolbarButton label="Gras" testId="button-editor-bold" active={editor?.isActive("bold")} disabled={controlDisabled} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Italique" testId="button-editor-italic" active={editor?.isActive("italic")} disabled={controlDisabled} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Souligné" testId="button-editor-underline" active={editor?.isActive("underline")} disabled={controlDisabled} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center gap-0.5 border-r border-border/70 pr-1">
          <ToolbarButton label="Titre de niveau 2" testId="button-editor-heading-2" active={editor?.isActive("heading", { level: 2 })} disabled={controlDisabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Titre de niveau 3" testId="button-editor-heading-3" active={editor?.isActive("heading", { level: 3 })} disabled={controlDisabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Titre de niveau 4" testId="button-editor-heading-4" active={editor?.isActive("heading", { level: 4 })} disabled={controlDisabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}><Heading4 className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center gap-0.5 border-r border-border/70 pr-1">
          <ToolbarButton label="Liste à puces" testId="button-editor-bullet-list" active={editor?.isActive("bulletList")} disabled={controlDisabled} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Liste numérotée" testId="button-editor-ordered-list" active={editor?.isActive("orderedList")} disabled={controlDisabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center gap-0.5 border-r border-border/70 pr-1">
          <ToolbarButton label="Ajouter ou modifier un lien" testId="button-editor-link" active={editor?.isActive("link")} disabled={controlDisabled} onClick={openLinkPanel}><Link2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Insérer une image" testId="button-editor-image" disabled={controlDisabled || uploading} onClick={openImagePicker}><ImagePlus className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center gap-0.5 border-r border-border/70 pr-1">
          <ToolbarButton label="Citation" testId="button-editor-blockquote" active={editor?.isActive("blockquote")} disabled={controlDisabled} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Ligne horizontale" testId="button-editor-horizontal-rule" disabled={controlDisabled} onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex items-center gap-0.5">
          <ToolbarButton label="Annuler" testId="button-editor-undo" disabled={controlDisabled || !editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Rétablir" testId="button-editor-redo" disabled={controlDisabled || !editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Choisir une image à insérer"
        data-testid="input-editor-image-file"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {linkPanelOpen && (
        <form onSubmit={applyLink} className="flex flex-col gap-2 border-b border-border/70 bg-card px-3 py-3 sm:flex-row sm:items-end" data-testid="form-editor-link">
          <div className="min-w-0 flex-1">
            <label htmlFor="editor-link-url" className="mb-1 block text-xs font-semibold text-foreground">Adresse du lien</label>
            <input
              id="editor-link-url"
              type="text"
              inputMode="url"
              value={linkHref}
              onChange={(event) => setLinkHref(event.target.value)}
              placeholder="https://exemple.fr"
              aria-label="Adresse du lien"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="input-editor-link-url"
              disabled={disabled}
              autoFocus
            />
            {linkHref && !isSafeHref(linkHref) && <p className="mt-1 text-xs text-destructive" role="alert">Utilisez une adresse http, https, mailto ou tel.</p>}
            {!selectionHasContent && <p className="mt-1 text-[11px] text-muted-foreground">Le lien sera inséré à la position du curseur.</p>}
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <button type="submit" disabled={disabled || !linkHref.trim() || !isSafeHref(linkHref)} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" data-testid="button-editor-link-apply">Appliquer</button>
            {editor?.isActive("link") && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { if (editor) { restoreSelection(editor); editor.chain().focus().extendMarkRange("link").unsetLink().run(); } setLinkPanelOpen(false); }} disabled={disabled} className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-50" data-testid="button-editor-link-remove">Retirer le lien</button>}
            <button type="button" aria-label="Fermer le panneau lien" onMouseDown={(event) => event.preventDefault()} onClick={() => setLinkPanelOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" data-testid="button-editor-link-close"><X className="h-4 w-4" /></button>
          </div>
        </form>
      )}

      {imagePanelOpen && (
        <form onSubmit={insertImage} className="border-b border-border/70 bg-card px-3 py-3" data-testid="form-editor-image">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{imageFile?.name ?? "Sélectionnez une image"}</p>
              <label htmlFor="editor-image-alt" className="mb-1 mt-2 block text-xs font-semibold text-foreground">Texte alternatif</label>
              <input
                id="editor-image-alt"
                type="text"
                value={imageAlt}
                onChange={(event) => setImageAlt(event.target.value)}
                placeholder="Décrivez l’image"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="input-editor-image-alt"
                disabled={disabled || uploading}
                autoFocus
              />
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <button type="submit" disabled={disabled || uploading || !imageFile} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" data-testid="button-editor-image-insert">{uploading ? "Ajout en cours…" : "Insérer l’image"}</button>
              <button type="button" aria-label="Annuler l’insertion de l’image" onMouseDown={(event) => event.preventDefault()} onClick={() => { setImagePanelOpen(false); setImageFile(null); setUploadError(""); }} disabled={uploading} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50" data-testid="button-editor-image-cancel"><X className="h-4 w-4" /></button>
            </div>
          </div>
          {uploadError && <p className="mt-2 text-xs text-destructive" role="alert" data-testid="error-editor-image-upload">{uploadError}</p>}
        </form>
      )}

      {!editor && (
        <div className="min-h-56 animate-pulse bg-muted/20 sm:min-h-72" aria-label="Chargement de l’éditeur" data-testid="loading-blog-rich-editor" />
      )}
      {editor && <EditorContent editor={editor} data-testid="content-blog-editor" />}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground sm:px-4">
        <span data-testid="text-editor-guidance">Collez ou rédigez votre contenu. La mise en forme reste éditable.</span>
        <span>HTML</span>
      </div>
    </div>
  );
}
