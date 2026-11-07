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
| Audiovisual | Justin Vidaure | Ignacio Latorre, Vicente Araya, Sebastián Hugueño, Daniel Castro |
| Lógica | José Luis | Mauricio Zuñiga, Marcelo Guzmán |
| Gestión y Documentación | Johan Cortés | José Araya |

## Licencia y créditos

La documentación se distribuye bajo licencia **CC BY 4.0**. Los nombres científicos y datos de las aves provienen de fuentes públicas; las imágenes, sonidos y música deben contar con licencia compatible con el repositorio.
