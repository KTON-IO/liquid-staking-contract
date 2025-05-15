# KTON Liquid Staking Protocol (V2)

KTON is a decentralized liquid staking protocol connecting TON holders with hardware node operators to participate in TON Blockchain validation through asset pooling.

## Core Participants

- **Nominators**: TON holders who stake funds in the pool and receive KTON tokens, which increase in value through validation rewards and can be used across DeFi protocols
- **Node Operators**: Run validator nodes using the pool's funds and share validation rewards
- **Governance**: Manages protocol parameters and risk

## Technical Documentation

The latest documentation is available in this repository.

## Development

- Clone repository with submodules: `git clone --recurse-submodules <git-url>`
- Install dependencies (Node.js v18+): `npm install`
- Build contracts: `npx blueprint build --all`
- Run tests: `npm test -- tests/*.ts` 
  - Note: Standard `npx blueprint test` won't work correctly due to tests in submodules
  - To run submodule tests: change directory to submodule and run tests from there
- Deploy: `npx blueprint run` (review script before execution)

## System Architecture

```
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│                │      │                │      │                │
│   Nominator    │──┐   │      Pool      │      │   Controller   │
│   (TON holder) │  │   │                │      │                │
│                │  │   │  - Manages     │      │  - Interfaces  │
└────────────────┘  │   │    deposits    │      │    with        │
                    ├──▶│  - Issues      │─────▶│    Elector     │
┌────────────────┐  │   │    KTON tokens │      │  - Manages     │
│                │  │   │  - Lends to    │      │    validator   │
│    Nominator   │──┘   │    Controllers │      │    funds       │
│                │      │                │      │                │
└────────────────┘      └────────────────┘      └────────────────┘
                               │   ▲                     │
                               │   │                     │
                               ▼   │                     ▼
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│                │      │                │      │                │
│   Governance   │      │  KTON Token    │      │    Elector     │
│                │      │                │      │                │
│  - Sets params │─────▶│  - Represents  │      │  - TON         │
│  - Risk mgmt   │      │    pool share  │      │    validation  │
│  - Fee control │      │  - Enables     │      │    system      │
│                │      │    DeFi usage  │      │                │
└────────────────┘      └────────────────┘      └────────────────┘
```

## Key Roles

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      Protocol Governance                    │
│                                                             │
└───────────┬─────────────┬─────────────┬─────────────┬──────┘
            │             │             │             │
            ▼             ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│              │ │              │ │              │ │              │
│    Halter    │ │    Sudoer    │ │   Approver   │ │   Treasury   │
│              │ │              │ │              │ │              │
│ - Can halt   │ │ - Upgrades   │ │ - Approves   │ │ - Collects   │
│   system     │ │   with delay │ │   controllers│ │   fees       │
│ - Close      │ │ - Emergency  │ │ - Sets       │ │ - Receives   │
│   deposits   │ │   operations │ │   allocations│ │   governance │
│              │ │              │ │   & timing   │ │   share      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## System Components

### Controller
The Controller manages funds for staking and interfaces with the TON Elector contract:
- Requests funds from Pool after Approver validation
- Accounts funds from Pool and validators
- Ensures validator-lent assets can't be withdrawn
- Returns stake plus interest after validation round

### Pool
Central contract managing the entire system:
- **Controller Interface**
  - Processes lending requests
  - Receives debt repayments
  - Maintains active controller list
- **User Interface**
  - Tracks KTON/TON ratio
  - Processes deposits/withdrawals
  - Distributes rewards
- **Governance Interface**
  - Updates system parameters
  - Distributes fees
  - Manages protocol roles

### KTON Token
Represents share in Pool assets, with DAO voting capabilities for network parameter governance.

### Payouts
For deposits/withdrawals postponed until round end. Implemented as NFT collections in V2.

## Comparison of V1 and V2

V2 introduces significant protocol improvements over V1:

### Architecture Changes
- **Contract Structure**: More modular with clearer separation of concerns between components
- **State Management**: Improved state handling with better safety checks
- **Enhanced Security Model**: Multiple layers of authorization with time-locked operations

### Credit System Enhancements

#### Credit Timing Control
- `credit_start_prior_elections_end`: Prevents pool from giving credits too early before elections end (new in V2)
- `disbalanceTolerance`: Now configurable by governance instead of hardcoded

#### Controller Allocation System (New in V2)
- `allocation`: Maximum credit limit per controller
- `allowed_borrow_start_prior_elections_end`: Timing restrictions for credit requests
- Provides credit prioritization capabilities for different controllers

#### Revenue Sharing Model (New in V2)
- Added flexible profit-sharing mechanism alongside static interest
- Approver can set `approver_set_profit_share`
- Controller sets `acceptable_profit_share` during credit request
- System uses the higher of static interest or revenue share
- Protects stakeholders during periods of increased staking profitability

### Governance Improvements

#### SudoerExecutor (New in V2)
SudoerExecutor is a specialized smart contract designed to enhance security in critical system operations:

- **Single-Use Design**: Once executed, it cannot be used again, eliminating persistent attack vectors
- **Time-Limited Authority**: Works in conjunction with the existing Sudoer quarantine period (typically 24-48 hours)
- **Targeted Operations**: Can be configured to perform specific predefined actions only (such as contract upgrades)
- **Implementation Pattern**: 
  - Deploy SudoerExecutor with precise configuration for the desired operation
  - Set it as the Sudoer of the target contract (e.g., Pool)
  - Wait for the mandatory quarantine period
  - Trigger execution with a simple message
  - The executor performs the configured action then deactivates itself

This approach significantly reduces the security risk compared to maintaining permanent Sudoer privileges, as the executor's capabilities are strictly limited to its configured action.

#### Enhanced Halter Role (Expanded in V2)
In V2, the Halter role has been significantly expanded beyond simple emergency halting:

- **Original Capability**: Ability to immediately halt all system components in an emergency
- **New Risk Management Tools**:
  - Can disable deposits (preventing new funds from entering the system during risky periods)
  - Can disable optimistic deposit/withdrawal mode (enforcing strict operation mode)
  - Cannot unilaterally re-enable these features (requiring governance approval)
  - Provides operational circuit breakers for specific protocol features

This expansion transforms the Halter from a simple emergency stop mechanism to a proactive risk management role that can selectively restrict certain operations while allowing others to continue.

#### Treasury Role (New in V2)
- New dedicated role for collecting fees from Pool (replaces InterestManager for fee collection)
- Set by governance and can be changed by governance
- Provides better separation of financial concerns

### User Experience Improvements

#### Instant Withdrawal Fee (New in V2)
- New fee for instant swap of KTON tokens to TON
- Accrued in pool state and added to governance fee on round finalization
- Creates incentive structure for more predictable liquidity management

#### Withdrawal to Response Address (Fixed in V2)
- Improved destination address handling
- Better security for withdrawal operations

#### On-chain Rate Query (New in V2)
- New `get_conversion_rate_unsafe` method for on-chain rate queries
- Enables more efficient integrations with other protocols

### Technical Improvements
- Safer message handling with try/catch instead of counting bits
- Code optimizations and security enhancements
- Improved error handling with more descriptive error codes
- More comprehensive test coverage

## Launch Guide
Refer to [launching.md](docs/launching.md) for detailed deployment instructions.

## Security Audit
The KTON Liquid Staking Protocol V2 has undergone a comprehensive security audit, completed in April 2025. The final audit report [20250417-KTON-Final-Audit-Report.pdf](./20250417-KTON-Final-Audit-Report.pdf) is included in this repository.

Key audit findings:
- No critical vulnerabilities that would require immediate pool upgrade
- All identified issues have been addressed in the current implementation
- Security improvements include enhanced role restrictions, safer message handling, and stronger validation checks
- The implementation of SudoerExecutor was highlighted as a security enhancement for privileged operations

The protocol has integrated multiple security layers:
- Strict parameter validation for all operations
- Role-based access controls with appropriate separation of concerns
- Time-delayed privileged operations (Sudoer mechanism)
- Multiple governance safeguards
