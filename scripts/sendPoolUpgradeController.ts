import { Address } from '@ton/core';
import { Pool, dataToFullConfig, poolFullConfigToCell } from '../wrappers/Pool';
import { compile, NetworkProvider, sleep } from '@ton/blueprint';

export function deepEqual(valueA: any, valueB: any) {
    if (valueA === valueB) {
        // any two same value.
        return true;
    }

    if (typeof valueA !== 'object' && typeof valueB !== 'object') {
        // for primitive values
        return valueA === valueB;
    }

    // rest of the conditions for two deeply cloned objects or arrays

    if (Array.isArray(valueA) !== Array.isArray(valueB)) {
        // deepEqual({},[]) -> false
        return false;
    }

    if (Object.keys(valueA).length !== Object.keys(valueB).length) return false;

    for (let key in valueA) {
        if (!valueB.hasOwnProperty(key)) return false; // if key not present
        if (!deepEqual(valueA[key], valueB[key])) return false;
    }
    return true;
}

export async function run(provider: NetworkProvider) {
    const pool_code = await compile('Pool'); // compile new pool code
    const controller_code = await compile('Controller'); // compile new controller code
    const payout_collection = await compile('PayoutNFTCollection'); // compile new payout collection code
    // * change metadata in `PoolConstants.ts` if needed

    const poolAddressString = await provider.ui().input('Please enter pool address:');
    const poolAddress = Address.parse(poolAddressString);
    const pool = provider.open(Pool.createFromAddress(poolAddress));

    const fullData = await pool.getFullDataRaw(); // get current pool data
    const oldPoolConfig = dataToFullConfig(fullData); // for backup
    const newPoolConfig = dataToFullConfig(fullData); // create new pool config based on old one

    newPoolConfig.controller_code = controller_code;
    newPoolConfig.payout_minter_code = payout_collection;
    // * other changes to the pool config can be made here
    // e.g. 
    newPoolConfig.instantWithdrawalFee = 167773; // 1% fee
    newPoolConfig.optimisticDepositWithdrawals = true;

    const storage = poolFullConfigToCell(newPoolConfig);
    await pool.sendUpgrade(provider.sender(), storage, pool_code, null);

    await sleep(30000); // wait for the transaction to be processed

    const newFullData = await pool.getFullDataRaw(); // get new pool data
    const newPoolConfig2 = dataToFullConfig(newFullData); // create new pool config based on new one

    // check if the new pool config is the same as the old one
    if (deepEqual(newPoolConfig, newPoolConfig2)) {
        console.log('New pool config is upgraded successfully');
    } else if (deepEqual(newPoolConfig, oldPoolConfig)) {
        console.log('New pool config is the same as the old one');
    } else {
        console.log('Error occurred while upgrading pool config');
        console.log('Previous pool full config:');
        const previousPoolConfig = oldPoolConfig as any;
        previousPoolConfig.controller_code = oldPoolConfig.controller_code.toBoc().toString('hex');
        previousPoolConfig.payout_minter_code = oldPoolConfig.payout_minter_code.toBoc().toString('hex');
        previousPoolConfig.pool_jetton_wallet_code = oldPoolConfig.pool_jetton_wallet_code.toBoc().toString('hex');
        console.log(previousPoolConfig);
    }
}
