import { createRouteLoader } from './route-loader.js';
import { loadStyle } from './style-loader.js';

export const loadRoute = createRouteLoader({
  home: { load: () => import('./modes/home.js'), styles: ['modes/home.css', 'modes/fullpage.css'] },
  main: { load: () => import('./modes/main.js'), styles: ['modes/main.css', 'modes/fullpage.css'] },
  rumor: { load: () => import('./modes/rumor.js'), styles: ['modes/rumor.css', 'modes/fullpage.css'] },
  city: { load: () => import('./modes/city.js'), styles: ['modes/city.css', 'modes/fullpage.css'] },
  console: { load: () => import('./modes/console.js'), styles: ['modes/console.css', 'modes/fullpage.css'] },
  dose: { load: () => import('./modes/dose.js'), styles: ['modes/dose.css', 'modes/fullpage.css'] },
  china: { load: () => import('./modes/china.js'), styles: ['modes/china.css', 'modes/fullpage.css'] },
  repository: { load: () => import('./modes/repository.js'), styles: ['modes/repository.css', 'modes/fullpage.css'] }
}, loadStyle);
