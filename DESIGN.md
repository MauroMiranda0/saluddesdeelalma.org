---
name: Salud desde el Alma
colors:
  background: '#f3e7db'
  surface: '#f3e7db'
  surface-card: '#ffffff'
  surface-subtle: '#cfc7ab'
  primary: '#868564'
  primary-hover: '#727152'
  primary-container: '#cfc7ab'
  on-primary: '#ffffff'
  secondary: '#7e5d41'
  secondary-hover: '#65482f'
  secondary-container: '#e8c59a'
  on-secondary: '#ffffff'
  accent: '#e8c59a'
  on-surface: '#34291f'
  on-surface-variant: '#66594d'
  outline: '#9c8d7b'
  outline-variant: '#d6c9b8'
  error: '#ba1a1a'
  on-error: '#ffffff'
typography:
  display:
    fontFamily: Inter
    fontSize: 44.8px
    fontWeight: '700'
    lineHeight: '1.2'
  display-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.25'
  headline-lg:
    fontFamily: Inter
    fontSize: 35.2px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 19.2px
    fontWeight: '600'
    lineHeight: '1.4'
  headline-sm:
    fontFamily: Inter
    fontSize: 17.6px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16.8px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 15.2px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 13.6px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12.8px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.25rem
  lg: 0.5rem
  xl: 0.75rem
  card: 15px
  banner: 20px
  full: 9999px
spacing:
  base: 4px
  gutter-mobile: 20px
  gutter-desktop: 32px
  container-max: 1200px
  section-gap: 80px
  header-height: 80px
---

## Marca y Estilo

El sitio debe sentirse como un espacio de psicoterapia calido, sereno y profesional. La direccion visual es editorial y humana: prioriza la claridad, la confianza y la contencion sobre efectos decorativos o patrones de bienestar genericos.

- **Atmosfera:** Intima, reflexiva, natural y confiable.
- **Audiencia:** Personas que buscan acompanamiento psicologico, autoconocimiento y bienestar emocional.
- **Tono:** Cercano y respetuoso, sin promesas grandilocuentes ni lenguaje clinico frio.
- **Recursos visuales:** Fondo crema, bloques amplios de aire, retratos cuidados, iconos discretos, etiquetas en mayusculas y detalles organicos suaves.
- **Evitar:** Gradientes saturados, sombras pesadas, fondos blancos dominantes, bordes oscuros y exceso de elementos espirituales decorativos.

## Paleta

La paleta usa tonos naturales de baja saturacion. El crema sostiene el sitio, el oliva representa crecimiento y accion, y el cafe aporta anclaje y legibilidad.

- **Crema `#f3e7db`:** Fondo principal, superficies extensas y contexto calido de lectura.
- **Salvia claro `#cfc7ab`:** Fondos secundarios, areas de apoyo, etiquetas suaves y separadores tonales.
- **Verde oliva `#868564`:** Accion principal, indicadores positivos, estados activos e iconos destacados. En hover usar `#727152`.
- **Melocoton `#e8c59a`:** Acento suave para fondos de iconos, resaltes y llamados secundarios; no usarlo como texto pequeno.
- **Cafe tierra `#7e5d41`:** Titulares, navegacion, contrastes y acciones secundarias. En hover usar `#65482f`.
- **Texto:** `#34291f` para contenido principal y `#66594d` para texto complementario.

Mantener el contraste suficiente para texto, iconos y estados interactivos. El salvia y melocoton funcionan como superficies, no como texto de bajo contraste.

## Tipografia

Usar **Inter** en todos los roles tipograficos. La jerarquia debe depender de escala, peso, color y espacio, no de combinar familias tipograficas.

- **Display:** 44.8px, peso 700, interlineado 1.2; 32px en movil. Reservado para el mensaje central del hero.
- **Titulos de seccion:** 35.2px, peso 600, interlineado 1.3, usualmente en cafe tierra.
- **Titulos de tarjeta:** Entre 17.6px y 19.2px, peso 600.
- **Cuerpo:** 15.2px, peso 400, interlineado 1.6. El texto introductorio puede usar 16.8px.
- **Etiquetas:** 12.8px, peso 600, mayusculas y `0.06em` de espaciado entre letras.
- **Enfasis:** La cursiva se limita a una frase breve dentro de un titular o testimonio; usar cafe tierra u oliva, nunca como unica senal semantica.

## Layout y Espaciado

El sistema usa un contenedor centrado y una cuadricula de doce columnas en escritorio que pasa a una sola columna en movil.

- **Contenedor:** Maximo `1200px`; padding horizontal de `20px` en movil y `32px` desde pantallas medianas.
- **Header:** Fijo, de `80px`, con fondo crema semitransparente, desenfoque de fondo y sombra muy leve.
- **Secciones:** Padding vertical de `80px`. El contenido debe respirar; no comprimir secciones por debajo de `48px` de separacion vertical.
- **Hero:** Dos columnas en escritorio, texto a la izquierda con ancho maximo de `500px` y retrato a la derecha entre `420px` y `460px` de ancho. En movil se apilan.
- **Grids:** Desafios en dos columnas y servicios o beneficios en tres columnas a partir de escritorio. En movil, una columna.
- **Movimiento:** Transiciones de 300ms. Las elevaciones en hover no superan 4px; la imagen hero puede escalar hasta `1.02`.

## Profundidad

La jerarquia se logra con contraste tonal y sombras ambientales de baja opacidad, no con bordes marcados.

- **Header:** `0 1px 8px rgba(52, 41, 31, 0.04)` sobre un fondo crema con transparencia.
- **Tarjetas:** Fondo blanco y sombras entre `0 4px 16px rgba(52, 41, 31, 0.04)` y `0 10px 30px rgba(52, 41, 31, 0.08)`.
- **Retrato hero:** Puede usar hasta `0 20px 40px rgba(52, 41, 31, 0.12)` y un halo suave melocoton detras.
- **Bordes:** Evitarlos en tarjetas. Usar `#d6c9b8` solo para campos, divisiones necesarias y estados de foco.

## Formas y Recursos

- **Botones:** Forma de pildora, texto e icono alineados, con padding vertical de 12px a 15px.
- **Tarjetas:** Radio de 15px. Campos e items compactos usan 12px; banners destacados, 20px.
- **Iconos:** Material Symbols dentro de circulos de color. Deben ayudar a escanear el contenido, no reemplazar etiquetas.
- **Hero:** Puede incluir una marca de agua psicologica de baja opacidad y un retrato con overlay cafe muy discreto.
- **Cinta de conceptos:** Una franja oliva con terminos de bienestar en mayusculas puede separar el hero del contenido. La animacion debe detenerse en hover y respetar reduccion de movimiento.

## Componentes

- **Boton primario:** Oliva `#868564`, texto blanco, radio completo y sombra suave. Puede incluir flecha o icono de envio.
- **Boton secundario:** Cafe tierra `#7e5d41`, texto blanco y radio completo. Usarlo para contraste sobre superficies salvia u oliva.
- **CTA:** Limitar los llamados principales a tres ubicaciones: navegacion superior, hero y seccion de contacto. No agregar botones flotantes ni CTA adicionales entre secciones.
- **Badge de confianza:** Pildora blanca con punto oliva, etiqueta en mayusculas y sombra leve.
- **Tarjetas de desafios:** Fondo salvia claro, radio de 15px, barra vertical cafe a la izquierda, cita en cursiva y texto explicativo. La barra puede cambiar a oliva en hover.
- **Tarjetas de servicios:** Fondo blanco sobre una seccion oliva; icono circular cafe, categoria en etiqueta, descripcion breve y zona inferior salvia para beneficios.
- **Tarjetas de beneficios:** Fondo blanco, icono en circulo melocoton y contenido minimo sin ruido visual.
- **Bloque de contacto:** Banner salvia claro con texto centrado, campos en linea en escritorio y apilados en movil. Debe incluir la nota de confidencialidad con icono de candado.
- **Footer:** Fondo crema o salvia claro, tres columnas de informacion y un aviso de apoyo emocional en una tarjeta blanca elevada.

## Accesibilidad

- Mantener contraste AA para texto y controles sobre crema, salvia, oliva y cafe.
- Incluir etiqueta accesible en iconos sin texto.
- Mostrar foco visible usando el cafe tierra con un anillo de 2px.
- Respetar `prefers-reduced-motion`: detener la cinta animada y eliminar transformaciones de hover.
- No comunicar error, confirmacion o urgencia solo con color.
