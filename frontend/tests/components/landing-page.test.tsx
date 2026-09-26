import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "../../app/page";

test("la landing contiene información operativa y caminos de acceso", () => {
  const markup = renderToStaticMarkup(<HomePage />);

  assert.match(markup, /Encuentra tu camino a traves del/);
  assert.match(markup, /Psic\. Jocelyn Gutiérrez/);
  assert.match(markup, /Terapia Individual/);
  assert.match(markup, /Terapia de Pareja/);
  assert.match(markup, /En línea o presencial/);
  assert.match(markup, /Preguntas frecuentes/);
  assert.match(markup, /Valle del Ciprés #148/);
  assert.match(markup, /9:00 a 21:00/);
  assert.match(markup, /56 6095 0665/);
  assert.match(markup, /https:\/\/wa\.me\/525660950665\?text=/);
  assert.match(markup, /Quiero iniciar mi proceso/);
  assert.match(markup, /\/admin\/login/);
  assert.match(markup, /src="\/logo.jpg"/);
  assert.match(
    markup,
    /Profesional de salud mental en un espacio de atención cálido/
  );
});
