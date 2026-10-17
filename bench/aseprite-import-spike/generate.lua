-- Research fixture generation only. Does not read or change user documents,
-- settings, installed extensions, or clipboard contents.
local out = assert(app.params.out)
local log = assert(io.open(out .. "/native-log.txt", "w"))
log:write("version=", tostring(app.version), "\napiVersion=", tostring(app.apiVersion), "\n")
local cases = {
  opaque = {{18,52,86,255}, {255,0,0,255}, {0,0,255,255}, {255,0,0,255}, {0,0,0,255}},
  alpha = {{18,52,86,255}, {255,0,0,255}, {0,0,255,255}, {255,0,0,255}, {9,8,7,0}, {4,200,80,128}}
}
for name, colors in pairs(cases) do
  local spr = Sprite(2, 1, ColorMode.RGB)
  local pal = Palette(#colors)
  for i, c in ipairs(colors) do
    pal:setColor(i-1, Color{r=c[1],g=c[2],b=c[3],a=c[4]})
  end
  spr:setPalette(pal)
  -- Artwork deliberately contains magenta, absent from the saved palette.
  spr.cels[1].image:drawPixel(0, 0, Color{r=255,g=0,b=255,a=255})
  spr:saveAs(out .. "/" .. name .. "-artwork.aseprite")
  spr:saveAs(out .. "/" .. name .. "-artwork.png")
  for _, ext in ipairs({"hex", "gpl", "pal", "ase", "aseprite", "png", "act", "col"}) do
    local path = out .. "/" .. name .. "-palette." .. ext
    local ok, err = pcall(function()
      app.command.SavePalette{ui=false, filename=path, columns=3}
    end)
    log:write(name, ".", ext, "=", tostring(ok), " ", tostring(err), "\n")
  end
  spr:close()
end
log:close()
