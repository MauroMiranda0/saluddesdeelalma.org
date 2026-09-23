import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "../../app/page";

test("la landing contiene información operativa y caminos de acceso", () => {
  const markup = renderToStaticMarkup(<HomePage />);

  assert.match(markup, /Un espacio para encontrarte contigo mismo/);
  assert.match(markup, /Terapia Individual/);
  assert.match(markup, /Terapia de Pareja/);
  assert.match(markup, /Preguntas frecuentes/);
  assert.match(markup, /Lo que dicen quienes han caminado con nosotros/);
  assert.match(markup, /¿Necesitas ayuda\? Escríbenos 😊/);
  assert.match(markup, /Valle del Ciprés #148/);
  assert.match(markup, /https:\/\/wa\.me\/525660950665\?text=/);
  assert.match(markup, /\/admin\/login/);
  assert.match(markup, /src="\/logo.jpg"/);
  assert.match(markup, /Profesional de salud mental en un espacio de atención cálido/);
});
