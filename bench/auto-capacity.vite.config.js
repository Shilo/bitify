import base from '../vite.config.js';
import {resolve} from 'node:path';
export default {...base,build:{outDir:'.tmp/auto-capacity/build',emptyOutDir:false,
  rollupOptions:{input:{capacity:resolve('bench/auto-capacity.html')}}}};
