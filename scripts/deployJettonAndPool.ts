import { Address, Cell, toNano, beginCell } from '@ton/core';
import { Pool, PoolFullConfig, dataToFullConfig, poolFullConfigToCell } from '../wrappers/Pool';
import { PoolState } from "../PoolConstants";
import { JettonMinter as DAOJettonMinter, jettonContentToCell } from '../contracts/jetton_dao/wrappers/JettonMinter';
import { compile, NetworkProvider, sleep } from '@ton/blueprint';



export async function run(provider: NetworkProvider) {

    const sender = provider.sender();
    const admin: Address = sender.address!;

    const pool_code = await compile('Pool');
    const controller_code = await compile('Controller');

    const payout_collection = await compile('PayoutNFTCollection');

    const dao_minter_code = await compile('DAOJettonMinter');
    let dao_wallet_code_raw = await compile('DAOJettonWallet');
    const dao_voting_code = await compile('DAOVoting');

    let lib_prep = beginCell().storeUint(2, 8).storeBuffer(dao_wallet_code_raw.hash()).endCell();
    const dao_wallet_code = new Cell({ exotic: true, bits: lib_prep.bits, refs: lib_prep.refs });

    const contentUrl = await provider.ui().input("Please enter jetton content url:");
    const multisigWalletAddressString = await provider.ui().input("Please enter multisig wallet address:");

    const multisigWalletAddress = Address.parse(multisigWalletAddressString);

    const interestRate = await provider.ui().input("Please enter interest rate:");
    const governanceFee = await provider.ui().input("Please enter governance fee:");
    const minLoan = await provider.ui().input("Please enter min loan:");
    const maxLoan = await provider.ui().input("Please enter max loan:");

    const confirmed = await provider.ui().prompt(`
        Deploy jetton with content url ${contentUrl}
        Multisig wallet address ${multisigWalletAddress}
        Interest rate ${interestRate}
        Governance fee ${governanceFee}
        Min loan ${minLoan} TON
        Max loan ${maxLoan} TON
    `);
    if (!confirmed) {
        return;
    }

    const content = jettonContentToCell({ type: 1, uri: contentUrl });

    const minter = DAOJettonMinter.createFromConfig({
        admin,
        content,
        voting_code: dao_voting_code
    },
        dao_minter_code);

    let poolFullConfig = {
        state: PoolState.NORMAL as (0 | 1),
        halted: false, // not halted
        totalBalance: 0n,
        poolJetton: minter.address,
        poolJettonSupply: 0n,

        // empty deposits/withdrawals
        depositMinter: null,
        requestedForDeposit: null,
        withdrawalMinter: null,
        requestedForWithdrawal: null,

        // To set X% APY without compound one need to calc
        // (X/100) * (round_seconds/year_seconds) * (2**24)
        interestRate: Number(interestRate),
        optimisticDepositWithdrawals: false,
        depositsOpen: true,

        savedValidatorSetHash: 0n,
        currentRound: {
            borrowers: null, roundId: 0,
            activeBorrowers: 0n, borrowed: 0n,
            expected: 0n, returned: 0n,
            profit: 0n
        },
        prevRound: {
            borrowers: null, roundId: 0,
            activeBorrowers: 0n, borrowed: 0n,
            expected: 0n, returned: 0n,
            profit: 0n
        },

        minLoanPerValidator: toNano(minLoan),
        maxLoanPerValidator: toNano(maxLoan),

        // To set X% put (X/100) * (2**24) here
        governanceFee: Number(governanceFee),

        sudoer: multisigWalletAddress,
        sudoerSetAt: 0,
        governor: multisigWalletAddress,
        governorUpdateAfter: 0xffffffffffff,
        interest_manager: multisigWalletAddress,
        halter: multisigWalletAddress,
        approver: multisigWalletAddress,
        treasury: multisigWalletAddress,

        controller_code: controller_code,
        pool_jetton_wallet_code: dao_wallet_code,
        payout_minter_code: payout_collection,

        // missing properties to prevent error
        instantWithdrawalFee: 0,
        accruedGovernanceFee: 0n,
        disbalanceTolerance: 30,
        creditStartPriorElectionsEnd: 0,
    };


    const pool = provider.open(Pool.createFromFullConfig(poolFullConfig, pool_code));

    const poolJetton = provider.open(minter);
    await poolJetton.sendDeploy(provider.sender(), toNano("0.1"));
    await provider.waitForDeploy(poolJetton.address);
    await pool.sendDeploy(provider.sender(), toNano("11")); // 10 TON is for minimum storage fee
    await provider.waitForDeploy(pool.address);
    await poolJetton.sendChangeAdmin(provider.sender(), pool.address);
}
