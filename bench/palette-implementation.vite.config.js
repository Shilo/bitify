import base from '../vite.config.js';
import {resolve} from 'node:path';
export default {...base,build:{outDir:'.tmp/palette-final-build',emptyOutDir:false,rollupOptions:{input:{app:resolve('index.html'),performance:resolve('bench/palette-implementation-performance.html')}}}};
