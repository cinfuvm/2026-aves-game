# Aves de Chile

Repositorio de documentación del proyecto **Aves de Chile**, un juego web/PWA desarrollado con TIC-80 y JavaScript. La documentación está construida con [Antora](https://antora.org/) e incluye:

- **PRD** (Product Requirements Document): visión, alcance, requisitos funcionales y no funcionales, reglas de batalla, contenido de las aves, arquitectura, cronograma, riesgos y criterios de aceptación.
- **UAT** (User Acceptance Testing): estrategia, ambiente de pruebas, casos de aceptación, matriz de trazabilidad, gestión de defectos y acta de aprobación.

> El nombre **Aves de Chile: Duelo Alado** es un nombre de trabajo. Puede cambiarse en `docs/antora.yml` y en el contenido sin afectar la estructura. No es el nombre final en caso de que se decida uno distinto.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Estructura

```text
.
├── antora-playbook.yml          # Configuración del sitio Antora
├── package.json                 # Scripts y dependencias de documentación
├── docs/
│   ├── antora.yml               # Descriptor del componente Antora
│   └── modules/
│       ├── ROOT/                # Portada y glosario
│       ├── prd/                 # Product Requirements Document
│       └── uat/                 # User Acceptance Testing
└── .github/workflows/docs.yml   # Build y despliegue a GitHub Pages
```

## Construir y previsualizar

```bash
npm install
npm run docs:build
npm run docs:serve
```

El sitio se genera en `build/site` y se publica en `http://localhost:8080`.

> El playbook usa el directorio actual como fuente de contenido. Antora espera que la fuente sea un repositorio Git; si aún no lo es, ejecuta `git init` y crea un primer commit antes de construir.
>
> El archivo `package-lock.json` está versionado para que el workflow de GitHub Actions use `npm ci` y obtenga instalaciones reproducibles.

## Ejecutar el juego (TIC-80)

El código del juego vive en `game/` (plantilla base de TIC-80 en TypeScript). La herramienta `bin/tsc80.js` compila `game/main.ts` y abre el cartucho en TIC-80.

### Requisitos

- **Node.js 20 o superior** y npm (ya necesarios para la documentación).
- **TIC-80 gratuito.** El ejecutable mínimo no usa sprites: todo se dibuja con formas y texto (decisión D-13 en `changes.md`). Cargar `game/game.js` (sprites y paleta) requiere TIC-80 PRO y queda para una versión futura.
- Instalar TIC-80 desde [tic80.com](https://tic80.com/create). Por defecto, `game/tsc80-config.json` apunta a `/Applications/TIC-80.app/Contents/MacOS/tic80` (macOS). En otros sistemas, usa la variable `TIC80_PATH` (ver abajo).

### Pasos

```bash
npm install               # instala las herramientas de build (una sola vez)
npm run game:build        # compila game/main.ts a game/build/output.js
npm run game:run          # compila, abre TIC-80 y vigila cambios en los .ts
```

Para verificar que funciona:

1. `npm run game:build` termina con `Build complete.` y existe `game/build/output.js`.
2. `npm run game:run` abre TIC-80 y carga el juego. La consola debe mostrar `load build/juego.tic` (si ya generaste las imágenes, ver abajo), `import code build/output.js` con `imported :)` y luego `run`.
3. En la terminal debe aparecer `Module import works!`, que confirma que `helpers.ts` se empaquetó bien.
4. Edita `game/main.ts`, guarda, y observa que la terminal muestra `Building ... Build complete.`. Para ver el cambio en TIC-80, presiona `Ctrl+R`: la herramienta recompila el cartucho, pero no recarga TIC-80 sola.

### Imágenes (sprites y fondos)

Las aves y los fondos viven en `game/assets-src/` (PNG de origen). Para que aparezcan en el juego hay que generar un cartucho de gráficos, `game/build/juego.tic`. Ese archivo no se versiona (`game/build/` está en `.gitignore`), así que cada persona lo genera en su equipo:

1. Requisitos: Python 3 con Pillow (`pip install pillow`) y TIC-80 instalado (la misma ruta de `ticExecutable` o `TIC80_PATH`, ver arriba).
2. Generar las hojas de sprites y fondos:

   ```bash
   python3 tools/build_sheet.py     # game/build/hoja_sprites.png, hoja_tiles.png, indice_ave.ts
   ```

3. Empaquetarlas en el cartucho con TIC-80:

   ```bash
   python3 tools/empaquetar_tic.py  # game/build/juego.tic
   ```

4. Luego corre `npm run game:run`. El lanzador carga `build/juego.tic` automáticamente si existe; si no, el juego corre sin imágenes.

Notas:
- Las ids de las aves están en `game/src/data/sprites.ts` (`SPRITE_POR_AVE`). Si cambias la hoja, revisa que coincidan con `indice_ave.ts`.
- `tools/build-assets.js` es un generador anterior que escribe `build/assets.tic`. El lanzador no lo usa; el flujo de arriba es el que se usa para los sprites.
- Tras cambiar un PNG, vuelve a correr los pasos 2 y 3.

### Otra ruta de TIC-80

Si TIC-80 no está en la ruta por defecto, define `TIC80_PATH` (tiene prioridad sobre `ticExecutable`):

```bash
TIC80_PATH=/ruta/a/tic80 npm run game:run
```

### Cambiar la herramienta

Si modificas `src/tsc80.ts`, recompila la herramienta con `npm run tsc80:build` antes de usar los comandos anteriores.

## Limpiar artefactos

```bash
npm run docs:clean
```

## Despliegue

El workflow `.github/workflows/docs.yml` construye el sitio con Antora y lo publica en GitHub Pages en cada push a `main` o mediante ejecución manual.

En la configuración del repositorio de GitHub:

1. Ir a **Settings → Pages**.
2. En **Build and deployment → Source**, seleccionar **GitHub Actions**.
3. Ejecutar el workflow `Docs` o hacer push a `main`.

> Antes de publicar, actualiza `site.url` en `antora-playbook.yml` con la URL real de GitHub Pages (incluyendo el nombre del repositorio si es un sitio de proyecto, por ejemplo `https://usuario.github.io/mi-repo`).
>
> Este workflow publica únicamente el sitio de documentación en la raíz de Pages. Si el juego PWA y la documentación comparten el mismo sitio, integra ambos artefactos en un único workflow y publica Antora bajo `/docs/`; si usan repositorios separados, cada uno puede desplegarse de forma independiente.

## Convenciones de edición

- Un archivo `.adoc` por tema, dentro de `docs/modules/<modulo>/pages/`.
- Los identificadores de requisitos usan el prefijo `RF-` (funcionales), `RNF-` (no funcionales), `BR-` (reglas de batalla) y `UAT-` (casos de prueba).
- Cada requisito funcional debe tener al menos un caso UAT asociado en la matriz de trazabilidad.
- Las referencias entre páginas usan `xref:modulo:pagina.adoc[texto]`.
- Las tablas se escriben con la sintaxis de AsciiDoc (`|===`).

## Equipo

| Equipo | Líder | Integrantes |
|---|---|---|
| Audiovisual | Justin Vidaure | Ignacio Latorre (Líder de Gestión de Audiovisual), Vicente Araya, Sebastián Hugueño, Daniel Castro |
| Lógica | José Luis | Mauricio Zuñiga, Marcelo Guzmán (Líder de Gestión de Lógica) |
| Gestión y Documentación | Johan Cortés | José Araya |

## Licencia y créditos

La documentación se distribuye bajo licencia **CC BY 4.0**. Los nombres científicos y datos de las aves provienen de fuentes públicas; las imágenes, sonidos y música deben contar con licencia compatible con el repositorio.
