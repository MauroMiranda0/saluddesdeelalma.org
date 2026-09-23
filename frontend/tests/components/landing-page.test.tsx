import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "../../app/page";

test("la landing contiene información operativa y caminos de acceso", () => {
  const markup = renderToStaticMarkup(<HomePage />);

  assert.match(markup, /Salud desde el Alma/);
  assert.match(markup, /Terapia Individual/);
  assert.match(markup, /Valle del Ciprés #148/);
  assert.match(markup, /https:\/\/wa\.me\/525660950665/);
  assert.match(markup, /\/admin\/login/);
  assert.match(markup, /src="\/logo.jpg"/);
  assert.match(markup, /Profesional de salud mental en un espacio de atención cálido/);
});
