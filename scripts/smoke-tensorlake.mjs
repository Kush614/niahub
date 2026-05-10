import { Sandbox } from 'tensorlake';

const list = await Sandbox.list();
console.log('list:', JSON.stringify(list).slice(0, 400));

console.log('--- creating sandbox ---');
const sb = await Sandbox.create();
console.log('id:', sb.sandboxId, 'status:', sb.status);

const r = await sb.run('python', { args: ['-c', 'print("hello from real sandbox")'] });
console.log('stdout:', JSON.stringify(r.stdout));
console.log('stderr:', JSON.stringify(r.stderr));

await sb.terminate();
console.log('terminated.');
