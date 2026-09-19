# Farmacias de Guardia Cádiz

Aplicación web que muestra las farmacias de guardia de la provincia de Cádiz,
indicando en cada momento cuál está **abierta ahora** (zona horaria
`Europe/Madrid`, con soporte de turnos nocturnos que cruzan la medianoche).

Los datos proceden del endpoint público de [cofcadiz.es](https://www.cofcadiz.es).
Esta web no es una fuente oficial.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (design system tipo Airbnb)
- Luxon para todo el cálculo horario en `Europe/Madrid`
- `HashRouter` para compatibilidad con GitHub Pages

## Scripts

```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo
npm test          # tests unitarios del motor horario (vitest)
npm run typecheck # comprobación de tipos
npm run build     # build de producción (dist/)
```

## Despliegue

El workflow `.github/workflows/deploy.yml` publica `dist/` en GitHub Pages en
cada push a `main`. La base de Vite se fija a la subruta del repositorio
(`/farmacias-guardia-cadiz/`); actívala en *Settings → Pages → Source: GitHub
Actions*.

## Estructura

```
src/
  api/        cliente del endpoint COF + caché (memoria + localStorage, TTL 15 min)
  domain/     modelo de dominio, normalización y motor de disponibilidad horaria
  hooks/      useGuardias: carga, refresco periódico y reloj "ahora"
  components/ estados compartidos (loading, error)
  pages/      HomePage (buscador + municipios) y MunicipalityPage (detalle)
tests/        tests del motor de disponibilidad (casos límite del plan)
```
