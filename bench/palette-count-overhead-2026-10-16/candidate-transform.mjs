// Production-candidate transformation isolated to the exact count ownership block.
// Never apply a generic replacement to unrelated App maps/sets.
export function candidate(code,label){
 code=code.replaceAll('\r\n','\n');
 const replace=(text,from,to)=>{if(!text.includes(from))throw Error(`Missing candidate anchor: ${from}`);return text.replace(from,to)};
 if(!['pruned','granular','slots'].includes(label))return code;
 if(label==='pruned')return replace(code,'const key = usageKey, live = items, records = colorUsage;','const key = usageKey, live = items, records = untrack(() => colorUsage);');
 const start=code.indexOf('  let colorUsage = $state.raw(new Map());'),end=code.indexOf('  async function outputColors(',start);
 if(start<0||end<0)throw Error('Missing count ownership boundaries');
 let block=code.slice(start,end);
 block=replace(block,'let colorUsage = $state.raw(new Map());','const colorUsage = new SvelteMap();');
 block=block.replaceAll('colorUsage = new Map(colorUsage).set(', 'colorUsage.set(');
 block=replace(block,'const key = usageKey, live = items, records = colorUsage;','const key = usageKey, live = items, records = untrack(() => [...colorUsage]);');
 block=replace(block,'    const next = new Map(records);\n    for (const [id, record] of stale) { record.controller?.abort(); next.delete(id); }\n    colorUsage = next;','    for (const [id, record] of stale) { record.controller?.abort(); colorUsage.delete(id); }');
 block=replace(block,'const next = new Map(colorUsage); next.delete(item.id); colorUsage = next;','colorUsage.delete(item.id);');
 if(label==='slots'){
  block=replace(block,`    const key = usageKey, live = items, records = untrack(() => [...colorUsage]);
    const stale = [...records].filter(([, record]) => record.key !== key || !live.includes(record.item));
    if (!stale.length) return;
    for (const [id, record] of stale) { record.controller?.abort(); colorUsage.delete(id); }`,`    const key = usageKey, live = items;
    untrack(() => {
      const current = new Map(live.map(item => [item.id, item]));
      for (const [id, record] of colorUsage) {
        if (!current.has(id)) { record?.controller?.abort(); colorUsage.delete(id); }
        else if (record && (record.key !== key || current.get(id) !== record.item)) {
          record.controller?.abort(); colorUsage.set(id, null);
        }
      }
      for (const id of current.keys()) if (!colorUsage.has(id)) colorUsage.set(id, null);
    });`);
  block=replace(block,'for (const record of colorUsage.values()) record.controller?.abort();','for (const record of colorUsage.values()) record?.controller?.abort();');
  block=replace(block,'colorUsage.delete(item.id);','colorUsage.set(item.id, null);');
 }
 if(/\bnext\b/.test(block))throw Error('Unexpected next identifier in transformed count ownership');
 return replace(code.slice(0,start)+block+code.slice(end),'<script>','<script>\n  import { SvelteMap } from "svelte/reactivity";');
}
