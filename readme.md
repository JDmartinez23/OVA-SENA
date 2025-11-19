# 🚀 Batalla Espacial

Juego arcade en React + Vite + Tailwind. Controlas una nave, esquivas meteoros y enfrentas jefes.

Demo local
```powershell
npm install
npm run dev
# abrir la URL que imprime Vite (ej. http://localhost:5173)
```

Build para producción
```powershell
npm run build
```

Embed en otra web (recomendado: iframe)
1. Build: `npm run build`
2. Copia la carpeta `dist` al servidor/web site en `/game/` (ej. `public/game/`)
3. En la página principal añade:
```html
<iframe src="/game/index.html" width="1000" height="700" style="border:0"></iframe>
```

Estructura mínima
```
public/
src/
package.json
vite.config.js
```

Licencia: MIT