# Pool

## Storage

- `state`
- `total_balance` - amount of TONs accounted when deposit, withdraw and profit
- `interest_rate` - surplus of credit that should be returned with credit body. Set as integer equal share of credit volume times `2**24`
- `optimistic_deposit_withdrawals?` - flag notifies whether optimistic mode is enabled
- `deposits_open?` - flag notifies whether deposits are open
- `current_round_borrowers` - Current _round\_data_
  * `borrowers` - dict of borrowers: `controller_address -> borrowed_amount`
  * `round_id`
  * `active_borrowers` - number of borrowers that didn't return loan yet
  * `borrowed` - amount of borrowed TON (no interest)
  * `expected` - amount of TON expected to be returned (`borrowed + interest`)
  * `returned` - amount of already returned TON
  * `profit` - currently obtained profit (at the end of the round should be equal to `returned-borrowed` and `expected-borrowed`)
- `prev_round_borrowers` - Previous _round\_data_
  * `borrowers` - dict of borrowers: `controller_address -> borrowed_amount`
  * `round_id`
  * `active_borrowers` - number of borrowers that didn't return loan yet
  * `borrowed` - amount of borrowed TON (no interest)
  * `expected` - amount of TON expected to be returned (`borrowed + interest`)
  * `returned` - amount of already returned TON
  * `profit` - currently obtained profit (at the end of the round should be equal to `returned-borrowed` and `expected-borrowed`)
- `min_loan_per_validator` - minimal loan volume per validator
- `max_loan_per_validator` - maximal loan volume per validator
- `governance_fee` - share of profit sent to governance

- **Minters Data**
  * KTON token minter address
  * KTON token supply
  * Deposit Payout address
  * Deposit Payout supply == number of deposited TON in this round
  * Withdrawal Payout address
  * Withdrawal Payout supply == number of burned KTON tokens in this round

- **Roles** addresses
  * sudoer
  * governance
  * interest manager
  * halter
  * approver
  * treasury

- **Codes** - code of child contracts needed either for deploy or for address authorization
  * `controller_code` - needed for controller authorization
  * `payout_code` - needed for Deposit/Withdrawal payouts deployment
  * `pool_jetton_wallet_code` - needed for calculation of address of Deposit Payout wallet

## Deploy

Pool and KTON token minter are deployed separately. Pool deploys Payout minters and initiates them. Address of KTON token wallet for Deposit Payout (minter) is calculated on Pool and passed to Deposit Payout in init message.

![scheme](images/pool-scheme.png)

## V2 Enhancements

V2 introduced several improvements to the Pool contract:

1. **Credit Timing Control**
   - Added `credit_start_prior_elections_end` to prevent early credit issuance
   - Made `disbalance_tolerance` configurable by governance

2. **Withdrawal Fee**
   - Added `instant_withdrawal_fee` for immediate KTON-to-TON conversions
   - Fee accrued in pool state and added to governance fee

3. **Treasury Role**
   - Separated fee collection from interest management
   - Provides better financial governance

4. **Halter Capabilities**
   - Can now close deposits and disable optimistic mode
   - Cannot unilaterally re-enable these features

5. **On-chain Rate Query**
   - New `get_conversion_rate_unsafe` method for current conversion rate
