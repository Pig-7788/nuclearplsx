import './main-plays.js';
import { loadStyle } from './style-loader.js';

const games = window.NEG.mainPlays;
games.defineLoader('nuclear_history_exhibit', () => Promise.all([
  import('./games/history.js'), loadStyle('history-exhibit.css')
]), { label: '核科学历史展台' });
games.defineLoader('multi_barrier_sort', () => Promise.all([
  import('./games/barriers.js'), loadStyle('waste-barriers.css')
]), { label: '核废料的四重屏障' });
games.defineLoader('reactor_build_game', () => Promise.all([
  import('./games/build.js'), loadStyle('modes/city.css')
]), { label: '核电站建造' });
games.defineLoader('life_service_station', () => Promise.all([
  import('./games/life-service.js'), loadStyle('lessons.css')
]), { label: '核技术生活服务站' });
games.defineLoader('protection_lab', () => Promise.all([
  import('./games/protection-lab.js'), loadStyle('lessons.css')
]), { label: '防护原理体验' });
games.defineLoader('research_desk', () => Promise.all([
  import('./games/research-desk.js'), loadStyle('lessons.css')
]), { label: '科研委托台' });
games.defineLoader('final_summary', () => Promise.all([
  import('./games/final.js'), loadStyle('lessons.css')
]), { label: '公众科普回应' });
