<script>
  // Draws an ImageData at its own pixel size. CSS scales the canvas up with hard edges.
  let { pixels, class: cls = '' } = $props();
  let canvas;

  $effect(() => {
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    canvas.getContext('2d').putImageData(pixels, 0, 0);
  });
</script>

<canvas bind:this={canvas} class={cls}></canvas>
