// Preserve exact retained operations without re-billing them. New calls are appended explicitly.
import fs from 'node:fs';
const prior='bench/claude-audit-2026-10-15/service/';
const knight=['eye',[[10,7],[13,7]]],gem=['gem',[[4,13]]],specular=['specular',[[8,11]]];
const regions=Object.fromEntries([knight,gem,specular,['tabard',[[10,12],[11,12],[12,12],[13,12]]]]);
const cases=[
 {id:'retained-knight-k4',inputs:[prior+'fixtures/knight-a.png'],service:[prior+'service/service-knight-count4-0.png'],count:4,regions},
 {id:'retained-knight-k16',inputs:[prior+'fixtures/knight-a.png'],service:[prior+'service/service-knight-count16-0.png'],count:16,regions},
 {id:'retained-knight-2frame-k8',inputs:[prior+'fixtures/knight-a.png',prior+'fixtures/knight-b.png'],service:[prior+'service/service-knight-2frame-count8-0.png',prior+'service/service-knight-2frame-count8-1.png'],count:8,regions},
 {id:'retained-knight-pico8',inputs:[prior+'fixtures/knight-a.png'],service:[prior+'service/service-knight-pico8-0.png'],target:prior+'fixtures/target-pico8.png',regions},
 {id:'retained-knight-edg8',inputs:[prior+'fixtures/knight-a.png'],service:[prior+'service/service-knight-edg8-0.png'],target:prior+'fixtures/target-edg8.png',regions}
];
fs.writeFileSync(new URL('cases.json',import.meta.url),JSON.stringify(cases,null,2)+'\n');
console.log('Prepared',cases.length,'retained paired cases; no paid calls.');
