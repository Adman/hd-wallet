/* @flow weak */

function filterCoinbase(utxos, minConfCoinbase) {
    return utxos.filter(function (utxo) {
        if (utxo.coinbase) {
            return utxo.confirmations >= minConfCoinbase;
        }
        return true;
    });
}

function filterUtxos(utxos, minConfOwn, minConfOther) {
    const usable = [];
    const unusable = [];

    for (let i = 0; i < utxos.length; i++) {
        const utxo = utxos[i];

        const isUsed = (utxo.own)
            ? utxo.confirmations >= minConfOwn
            : utxo.confirmations >= minConfOther;

        if (isUsed) {
            usable.push(utxo);
        } else {
            unusable.push(utxo);
        }
    }
    return {
        usable: usable,
        unusable: unusable,
    };
}

module.exports = function tryConfirmed(algorithm, options) {
    const own = options.own || 1;
    const other = options.other || 6;
    const coinbase = options.coinbase || 100;

    return function (utxos, outputs, feeRate, optionsIn) {
        utxos.forEach(function (utxo) {
            if (utxo.coinbase == null || utxo.own == null || utxo.confirmations == null) {
                throw new Error('Missing information.');
            }
        });

        utxos = filterCoinbase(utxos, coinbase);

        if (utxos.length === 0) {
            return {};
        }

        const trials = [];

        let i;
        // first - let's keep others at options.other and let's try decrease own, but not to 0
        for (i = own; i > 0; i--) {
            trials.push({other: other, own: i});
        }

        // if that did not work, let's try to decrease other, keeping own at 1
        for (i = other - 1; i > 0; i--) {
            trials.push({other: i, own: 1});
        }

        // if that did not work, first allow own unconfirmed, then all unconfirmed
        trials.push({other: 1, own: 0});
        trials.push({other: 0, own: 0});

        let unusable = utxos;
        let usable = [];

        for (i = 0; i < trials.length; i++) {
            const trial = trials[i];

            // since the restrictions are always loosening, we can just filter the unusable so far
            const filterResult = filterUtxos(unusable, trial.own, trial.other);

            // and we can try the algorithm only if there are some newly usable utxos
            if (filterResult.usable.length > 0) {
                usable = usable.concat(filterResult.usable);
                unusable = filterResult.unusable;

                const result = algorithm(usable, outputs, feeRate, optionsIn);
                if (result.inputs) {
                    return result;
                }

                // we tried all inputs already
                if (unusable.length === 0) {
                    return result;
                }
            }
        }

        // we should never end here
        // throw new Error('Unexpected unreturned result')
    };
};
