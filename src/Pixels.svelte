<script>
  // Draws an ImageData at its own pixel size. CSS scales the canvas up with hard edges.
  let { pixels, class: cls = '' } = $props();
  let canvas;

  $effect(() => {
    // Setting a canvas's size clears it and makes its memory anew, even to the size it has.
    if (canvas.width !== pixels.width) canvas.width = pixels.width;
    if (canvas.height !== pixels.height) canvas.height = pixels.height;
    canvas.getContext('2d').putImageData(pixels, 0, 0);
  });
</script>

<canvas bind:this={canvas} class={cls}></canvas>
