import assert from "node:assert/strict";
import test from "node:test";
import { getEditorHtmlOrNull } from "../lib/blogEditorHtml.ts";

test("n’essaie pas de sérialiser un éditeur détruit dont le schéma est nul", () => {
  let getHTMLCalled = false;
  const destroyedEditor = {
    isDestroyed: true,
    schema: null,
    getHTML() {
      getHTMLCalled = true;
      throw new TypeError("Cannot read properties of null (reading 'cached')");
    },
  };

  assert.equal(getEditorHtmlOrNull(destroyedEditor), null);
  assert.equal(getHTMLCalled, false);
});

test("retourne le HTML d’un éditeur initialisé", () => {
  const editor = {
    isDestroyed: false,
    schema: {},
    getHTML: () => "<p>Article</p>",
  };

  assert.equal(getEditorHtmlOrNull(editor), "<p>Article</p>");
});
