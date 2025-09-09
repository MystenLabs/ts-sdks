# Wallet Auto-Approval System

The Wallet Auto-Approval System enables users to authorize automatic signing of specific transaction
types, reducing friction for trusted applications while maintaining security and user control

## Overview

This system provides a standard implementation for wallets to automatically approve transactions
based on predefined policies. It consists of three main components:

- **AutoApprovalPolicy**: Application-hosted policies defining approved transaction types
- **AutoApprovalManager**: SDK class for policy management and transaction evaluation
- **AutoApprovalIntent**: Optional hints from applications about which policy rule sets to apply

## Architecture

### Policy Discovery

Applications host their `AutoApprovalPolicy` at:

```
/.well-known/sui/automatic-approval-policy.json
```

This well-known location enables wallets to discover policies without requiring explicit
advertising, making policies easier to mange for wallets, easier to audit and harder to change
frequently or generate dynamically to target specific users.

### Policy Structure

An `AutoApprovalPolicy` contains:

- **ruleSets**: Collections of rules describing allowed asset interactions
- **suggestedSettings**: Recommended user configurations (budgets, limits, etc.)
- **defaultRuleSet**: Fallback ruleset for transactions without explicit intents

### Rule Types

Each ruleset specifies rules for different asset access patterns:

- **ownedObjects**: Access to specific object types the user owns
- **sessionCreatedObjects**: Access to objects created during the current session
- **balances**: Access to specific coin type balances
- **allBalances**: Access to all coin balances

### Policy Settings

User-controlled limits applied to approved policies. These are controlled by the wallet and can be
configured by the user.

- **remainingTransactions**: Maximum transactions per session
- **expiration**: Session expiration timestamp
- **approvedRuleSets**: Currently active rulesets
- **usdBudget**: USD spending limit across all coins
- **coinBudgets**: Per-coin-type spending limits

## Usage Flow

1. **Transaction Construction**: Applications build transactions normally, optionally adding
   `tx.add(autoApproval(ruleSetId))` for non-default rulesets

2. **Policy Evaluation**: Wallet loads the AutoApprovalManager and analyzes the transaction against
   current policy state

3. **Auto-Approval Decision**: If approved, wallet signs automatically; otherwise, falls back to
   standard user confirmation

4. **State Updates**: On signing, the manager deducts balances and policy settings. After execution,
   transaction effects can be applied to track new objects and increase balances in the policy
   settings.

## Implementation

### AutoApprovalManager Class

The core SDK class manages policy state and transaction analysis:

```typescript
class AutoApprovalManager {
	constructor(options: AutoApprovalManagerOptions);
	analyzeTransaction(tx: Transaction): Promise<TransactionAnalysis>;
	commitTransaction(analysis: TransactionAnalysis): void;
	applyTransactionEffects(analysis: TransactionAnalysis, effects: TransactionEffects): void;
	update(policy: AutoApprovalPolicy, settings: AutoApprovalPolicySettings): void;
	approve(): void;
	reset(): void;
	export(): string;
}
```

### State Management

The manager maintains an `AutoApprovalState` tracking:

- Current policy and settings
- Balance changes and transaction history
- Created objects from approved transactions
- Approved and pending transaction digests

## Design Decisions

### Limited API Surface

Applications have no visibility into auto-approval state, ensuring:

- Simple adoption (just publish a policy)
- Compatibility with non-supporting wallets
- Graceful degradation when users opt out

### User Control

All limits and permissions remain under user control:

- Policies only describe what _may_ be auto-approved
- Users set actual budgets and transaction limits
- Access can be revoked at any time without breaking functionality

### Security

Well-known policy locations and structured rules provide:

- Auditability of application intentions
- Protection against dynamic policy manipulation
