
const strategy = 'sequential';
const timeout = 6;
const members = [
    { extensionNumber: '000601' },
    { extensionNumber: '000604' },
    { extensionNumber: '000606' }
];
const sipServer = 'localhost';

function testGenerate(strategy, timeout, members) {
    let actions = '';
    if (strategy === 'sequential') {
        const steps = members.map(m => {
            return `          <action application="set" data="call_timeout=${timeout}"/>
          <action application="bridge" data="{ignore_early_media=true}sofia/internal/${m.extensionNumber}@${sipServer}"/>`;
        });
        actions = `          <!-- Try each member in order -->\n` + steps.join('\n');
    }
    console.log(actions);
}

console.log('--- Testing Sequential ---');
testGenerate('sequential', 6, members);

console.log('\n--- Testing Cascade ---');
const membersCascade = [
    { extensionNumber: '000601', priority: 1 },
    { extensionNumber: '000604', priority: 1 },
    { extensionNumber: '000606', priority: 2 }
];

function testCascade(timeout, members) {
    let actions = `          <action application="set" data="ignore_early_media=true"/>`;
    const tiers = new Map();
    members.forEach(m => {
        const p = m.priority || 1;
        if (!tiers.has(p)) tiers.set(p, []);
        tiers.get(p).push(`sofia/internal/${m.extensionNumber}@${sipServer}`);
    });
    const sortedPriorities = Array.from(tiers.keys()).sort((a, b) => a - b);
    sortedPriorities.forEach(p => {
        const group = tiers.get(p);
        const endpoints = group.join(',');
        actions += `\n          <!-- Tier ${p}: Ring all priority-${p} members in parallel -->
          <action application="set" data="call_timeout=${timeout}"/>
          <action application="bridge" data="{ignore_early_media=true}${endpoints}"/>`;
    });
    console.log(actions);
}
testCascade(6, membersCascade);
