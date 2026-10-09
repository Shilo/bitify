import { mount } from 'svelte';
import './foundation.css';
import App from '../App.svelte';
const mode = new URLSearchParams(location.search).get('prototype');
const initialDesign = ['dock', 'inspector', 'clear', 'legacy'].includes(mode) ? mode : 'dock';
if (initialDesign !== 'legacy') document.documentElement.dataset.prototype = initialDesign;
mount(App, { target: document.getElementById('app'), props: { prototype: true, initialDesign } });
