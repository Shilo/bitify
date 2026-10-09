import { mount } from 'svelte';
import './foundation.css';
import App from '../App.svelte';
const mode = new URLSearchParams(location.search).get('prototype');
document.documentElement.dataset.prototype = ['dock', 'inspector', 'clear'].includes(mode) ? mode : 'dock';
mount(App, { target: document.getElementById('app'), props: { prototype: true } });
