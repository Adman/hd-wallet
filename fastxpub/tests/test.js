const fs = require('fs');

const file = fs.readFileSync('../build/fastxpub.wasm');
const bitcoin = require('bitcoinjs-lib');
const fastxpub = require('../build/fastxpub');

function test_derivation(xpub, version, addressFormat, filename) {
    const node = bitcoin.HDNode.fromBase58(xpub).derive(0);

    const nodeStruct = {
        depth: node.depth,
        child_num: node.index,
        fingerprint: node.parentFingerprint,
        chain_code: node.chainCode,
        public_key: node.keyPair.getPublicKeyBuffer(),
    };

    const addresses = fastxpub.deriveAddressRange(nodeStruct, 0, 999, version, addressFormat);

    const correct = fs.readFileSync(filename).toString().split('\n');

    for (let i = 0; i <= 999; i++) {
        if (correct[i] !== addresses[i]) {
            console.log('FAILED', i, correct[i], addresses[i]);
            return false;
        }
    }
    return true;
}

function sanity_check_xpub() {
    const master = 'xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw';
    const child = bitcoin.HDNode.fromBase58(master).derive(1).toBase58();
    return fastxpub.deriveNode(master, 1, bitcoin.networks.bitcoin.bip32.public) === child;
}

fastxpub.init(file).then(() => {
    let success;

    success = test_derivation('xpub6BiVtCpG9fQPxnPmHXG8PhtzQdWC2Su4qWu6XW9tpWFYhxydCLJGrWBJZ5H6qTAHdPQ7pQhtpjiYZVZARo14qHiay2fvrX996oEP42u8wZy', 0, 0, 'test-addresses.txt');
    if (!success) process.exit(1);

    success = test_derivation('xpub6CVKsQYXc9awxgV1tWbG4foDvdcnieK2JkbpPEBKB5WwAPKBZ1mstLbKVB4ov7QzxzjaxNK6EfmNY5Jsk2cG26EVcEkycGW4tchT2dyUhrx', 5, 1, 'test-addresses-segwit-p2sh.txt');
    if (!success) process.exit(1);

    if (!(sanity_check_xpub())) process.exit(1);

    console.log('PASSED');
    process.exit(0);
}, () => {
    process.exit(1);
});
