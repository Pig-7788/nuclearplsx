import './main-plays.js';
import { loadStyle } from './style-loader.js';

const games = window.NEG.mainPlays;
games.defineLoader('nuclear_history_exhibit', () => Promise.all([
  import('./games/history.js'), loadStyle('history-exhibit.css')
]), { label: '核科学历史展台' });
games.defineLoader('multi_barrier_sort', () => Promise.all([
  import('./games/barriers.js'), loadStyle('waste-barriers.css')
]), { label: '核废料的四重屏障' });
games.defineLoader('match_connect', () => import('./games/match.js'), { label: '科技与应用配对' });
games.defineLoader('rumor_debunking_game', () => Promise.all([
  import('./games/debunk.js'), loadStyle('modes/rumor.css')
]), { label: '核谣言粉碎机' });
games.defineLoader('reactor_build_game', () => Promise.all([
  import('./games/build.js'), loadStyle('modes/city.css')
]), { label: '核电站建造' });
games.defineLoader('final_summary', () => import('./games/final.js'), { label: '结业答辩' });
