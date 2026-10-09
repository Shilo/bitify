if (new URLSearchParams(location.search).has('prototype')) {
  import('./prototypes/main.js');
} else {
  import('./app-main.js');
}
