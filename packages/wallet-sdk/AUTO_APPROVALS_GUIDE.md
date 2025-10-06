# Wallet Automatic Approvals

Wallet automatic approvals (auto-approvals) will enable users and applications to securely opt into
auto-approval of specific types of transactions with user-defined limits and budgets.

## Demo

https://github.com/user-attachments/assets/4f7b0973-770a-4eec-89d4-e7776237b696

## Goals

- A standard, not just a bespoke wallet-specific feature
  - This is important for broader ecosystem adoption!
  - Solve problems across all wallets, but also give wallets headroom to choose what they’ll
    automatically approve.
- Layered on top of the existing transaction approval flow, so that it’s as simple as possible for
  dapps to integrate.
  - Our goal is for most dapps to be compatible with this!
  - Auto-approvals is not a separate feature, but works as part of the existing signing flows
  - Should require minimal app code changes to enable auto-approvals
- For any given transaction, even if it is valid for the automatic approval, a wallet may still
  choose to display the user with an approval prompt.
- Completely opt-in on the user side, with no effect on the app when the user opts in or out

## How It Works

**Applications Define Their Operations**: Understanding the intent behind a Transaction is a hard
problem. Rather than wallets guessing what a transaction does, applications will publish a policy
that describes the different types of operations it might perform, and what types of assets those
operations use. A game might declare that it performs "character moves" that require gas fees and
modify player objects. A DEX might declare that it performs "token swaps" using any coin type. These
policies are public, auditable, and serve as contracts with users about what the application will
do.

**Wallets Detect Policies**: Wallets will detect when an application has configured an auto-approval
policy, and may prompt the user to enable auto-approvals. It is up to each wallet to decide how and
when to implement this flow, but could be done when the user is first prompted for a transaction
covered by the auto-approval policy.

**Users Configure Settings They Control**: When the wallet prompts a user to opt into
auto-approvals, they will be presented with descriptions of the different operations an application
supports, and what assets they need to access. They can select what operations are auto approved, as
well as what limits to enforce on those operations. They might allow 100 game moves using up to 1
SUI for gas, expiring after 2 hours. Or 50 token swaps up to $500 total value, expiring after their
trading session. These limits are enforced by the wallet, not the application, ensuring no
application can exceed what users have approved.

**Wallets Determine What Gets Auto-Approved**: Applications simply request signatures on
transactions through the existing wallet-standard methods, and won't know if the user is using
auto-approvals. The wallet can evaluate if the transaction matches the application's policy and if
the user's settings would allow the transaction to be automatically approved. If the policy and
settings allow for auto-approval, the wallet may automatically sign the transaction.

## How Applications Support Auto-Approvals

Applications support auto-approvals through two simple steps: publishing a policy document and
tagging their transactions with an operation type.

The system is intentionally designed so that applications have no knowledge of whether
auto-approvals are enabled, and instead applications always provide wallets enough information to
enable auto-approvals if the user opts in. Applications don't need to check for support, handle
different code paths, or worry about compatibility. They simply publish their policy, tag their
transactions, and let wallets handle everything else. This clean separation of concerns means
applications can adopt auto-approvals with confidence that they won't break anything for existing
users.

### Creating Policy Documents

The policy document is a JSON file that describes the different types of operations an application
performs. Each operation represents a category of transactions that share similar characteristics -
for example, "game actions", "marketplace trades", or "governance votes". The policy tells wallets
what objects transactions need to access, what coins they might spend, and how they interact with
the blockchain.

When designing operations, applications consider how users interact with them. They group related
actions together when they require similar permissions, but separate them when users might want
different approval settings. For instance, they might separate "gameplay" operations from
"marketplace" operations, since users might be comfortable auto-approving routine game moves but
want to manually approve each marketplace transaction.

The permissions applications declare should be as specific as possible while still covering their
needs. If a game only needs to modify the player's character object, it should only declare that
specific object type. If it only spends SUI for gas, it should only declare SUI rather than using
`anyBalance`. This specificity helps users trust the application and makes them more likely to
enable auto-approvals.

<details>
<summary><b>Example: Complete Policy Structure</b></summary>

```json
{
	"schemaVersion": "1.0.0",
	"operations": [
		{
			"id": "gameplay",
			"name": "Gameplay Actions",
			"description": "Regular gameplay actions like moving, attacking, and using items",
			"autoApprovalEnabled": true,
			"permissions": {
				// Coins needed for transactions
				"balances": [
					{
						"$kind": "CoinBalance",
						"coinType": "0x2::sui::SUI",
						"description": "Gas fees for gameplay transactions"
					}
				],

				// Objects the user owns that we need to access
				"ownedObjects": [
					{
						"$kind": "ObjectType",
						"objectType": "0xgame::character::Character",
						"accessLevel": "mutate",
						"description": "Update character stats and position"
					},
					{
						"$kind": "ObjectType",
						"objectType": "0xgame::inventory::Item",
						"accessLevel": "transfer",
						"description": "Use and trade items from inventory"
					}
				]
			}
		},
		{
			"id": "marketplace",
			"name": "Marketplace Trading",
			"description": "Buy and sell items on the marketplace",
			"autoApprovalEnabled": false,
			"permissions": {
				// Can use any coin type for marketplace transactions
				"anyBalance": {
					"$kind": "AnyBalance",
					"description": "Use any token for marketplace purchases"
				},

				"ownedObjects": [
					{
						"$kind": "ObjectType",
						"objectType": "0xgame::marketplace::Listing",
						"accessLevel": "transfer",
						"description": "Create and manage marketplace listings"
					}
				]
			}
		}
	]
}
```

</details>

<details>
<summary><b>Operation Fields Explained</b></summary>

Each operation in your policy includes several required and optional fields:

- **`id`**: A unique identifier for the operation type (e.g., "gameplay", "marketplace")
- **`name`**: A short, human-readable name displayed in wallet UI (e.g., "Gameplay Actions")
- **`description`**: A detailed explanation of what this operation does
- **`autoApprovalEnabled`**: Whether this operation supports automatic approvals
  - Set to `true` for operations users might want to auto-approve (routine gameplay, simple
    transfers)
  - Set to `false` for operations that should always require manual approval (high-value trades,
    admin functions)
  - This allows you to document all your application's operations while only enabling auto-approvals
    for appropriate ones
- **`permissions`**: The blockchain permissions this operation requires (detailed below)

Applications should set `autoApprovalEnabled: false` for sensitive operations like:

- High-value financial transactions
- Administrative or governance actions
- Operations that modify critical user settings
- One-time setup operations

</details>

<details>
<summary><b>Permission Types Explained</b></summary>

```json
{
	"permissions": {
		// balances: Specific coin types your transactions use
		"balances": [
			{
				"$kind": "CoinBalance",
				"coinType": "0x2::sui::SUI", // Full type name
				"description": "Human-readable explanation"
			}
		],

		// anyBalance: For apps that work with any coin type (DEXes, marketplaces)
		"anyBalance": {
			"$kind": "AnyBalance",
			"description": "Why you need any coin type"
		},

		// ownedObjects: Objects the user owns that you need to access
		"ownedObjects": [
			{
				"$kind": "ObjectType",
				"objectType": "0xpackage::module::Type",
				"accessLevel": "read", // Pass by reference (&T) to Move functions
				"accessLevel": "mutate", // Pass by mutable reference (&mut T) to Move functions
				"accessLevel": "transfer", // Pass by value (T) to Move functions
				"description": "What you do with this object"
			}
		]
	}
}
```

</details>

### Hosting Policies

Once applications have created their policy document, they need to host it at a well-known location
where wallets can find it. The URL pattern is standardized so wallets know exactly where to look
without any configuration or registration process. The policy should be served as a static file - it
shouldn't be dynamically generated or personalized per user. Wallets may cache policies, or fetch
policies through their own backends to prevent serving policies tailored to specific users.

The URL follows this pattern:
`https://yourdomain.com/.well-known/sui/{network}/automatic-approval-policy.json`

Applications must serve their policy with appropriate CORS headers to allow wallets to fetch it.
Some wallets may be web-based and need to fetch policies from their own origin.

### Tagging Transactions

The final step in supporting auto-approvals is tagging transactions with the appropriate operation
ID and an optional description. This is done using the `operationType` function, which adds a
special intent to the transaction that tells wallets which operation from the policy this
transaction represents.

The description parameter allows applications to provide specific context about what the individual
transaction is doing within the broader operation type. This is particularly useful for operations
that handle multiple types of actions. For example, a "walrus-operations" operation type might
handle both "Register blob" and "Certify blob" transactions - the description helps users understand
exactly what's happening in each step.

<details>
<summary><b>Example: Adding Operation Type to Transaction</b></summary>

```typescript
import { Transaction, operationType } from '@mysten/sui/transactions';

// Basic usage - just operation ID
const tx = new Transaction();
tx.add(operationType('gameplay'));
tx.add(contract.doAction(params));

// With description for specific context
const registerTx = new Transaction();
registerTx.add(operationType('walrus-operations'));
registerTx.add(walrus.register(params));

const certifyTx = new Transaction();
certifyTx.add(operationType('walrus-operations'));
certifyTx.add(walrus.certify(params));
```

</details>

The tagging process is completely transparent to wallets that don't support auto-approvals. The tags
are automatically stripped out before being sent to any wallet that does not advertise supporting
the intent, so the transaction executes normally without any compatibility issues.

---

## How Auto-Approvals Work for Users

The specific flows used to enable and configure automatic approvals are up to each wallet, but they
should be an entirely optional enhancement to the normal transaction signing flows users are already
familiar with. When users encounter an application that supports auto-approvals, they see the same
signing dialogs they're used to, with the option to enable auto-approvals if they choose. Users can
completely ignore the feature and continue using their wallet exactly as before, or they can opt in
when they want the convenience of automatic signing for trusted applications.

Core functionality any auto-approval implementation should support:

- Detecting when an application has an auto-approval policy
- An Auto approval opt in flow for configuring the auto-approval settings
  - Users should see clear descriptions of the assets each operation needs to access
  - This may be part of connect, transaction signing, or some other settings view in the wallet
  - Settings should allow configuring:
    - what operations can be auto-approved
    - budgets for specific coin types
    - budgets in some normalized currency (eg, USD)
    - expiration for the policy
- A UI for when transactions are being auto-approved
  - This may include a countdown and cancel button
- A very easy way to disable and opt out of auto-approvals
  - This may also include a way to edit the existing auto-approval settings

## How Wallets Implement Auto-Approvals

Because the application side of auto-approvals is very simple, wallets do not need to use any
specific libraries or standards to support auto approvals, but we are releasing a new
`@mysten/wallet-sdk` package which will include tools that significantly simplify the
implementation.

The wallet SDK includes two main components to help with auto approvals: the TransactionAnalyzer for
understanding transactions, and the AutoApprovalManager for managing state and policy enforcement.
These components work together to provide an easy-to-use foundation to build auto-approvals on.

### Transaction Analysis

The TransactionAnalyzer examines transactions to understand what they do, what objects they access,
how they use coins, and what operation type they represent. The output of this analysis is an object
with normalized and easy to use data representing all the different aspects of a Transaction. It is
intended to be used as the foundation for all Transaction approval flows that show users what a
transaction does.

The analyzer is designed to be extended with custom data. While it comes with comprehensive built-in
analyzers for understanding transaction structure, coin flows, and object access patterns, you can
add your own analyzers for wallet-specific needs. For auto-approvals, the base analyzer is extended
with the `operationTypeAnalyzer` to extract the operation type that applications embed in
transactions, and the `coinValueAnalyzer` to calculate coin values in a normalized currency for
budget tracking.

<details>
<summary><b>Example: Basic Transaction Analysis</b></summary>

```typescript
import {
	TransactionAnalyzer,
	operationTypeAnalyzer,
	createCoinValueAnalyzer,
} from '@mysten/wallet-sdk';

async function analyzeTransaction(
	client: SuiClient,
	transactionJson: string, // From wallet-standard's transaction.toJSON()
) {
	// Create the analyzer with the specific analyzers you need
	const analyzer = TransactionAnalyzer.create(client, transactionJson, {
		// Extract operation type for auto-approvals
		operationType: operationTypeAnalyzer,

		// Calculate USD values for budget tracking
		coinValues: createCoinValueAnalyzer({
			getCoinPrices: async (coinTypes) => {
				// Integrate with your price feed service
				// This example returns mock prices
				return coinTypes.map((type) => ({
					coinType: type,
					decimals: 9,
					price: type.includes('SUI') ? 2.5 : 1.0,
				}));
			},
		}),
	});

	// Run the analysis
	const { results, issues } = await analyzer.analyze();

	// Check for any issues during analysis
	if (issues.length > 0) {
		console.warn('Transaction analysis issues:', issues);
		// Handle or display issues to user
	}

	return { results, issues };
}
```

</details>

The TransactionAnalyzer should handle all data-loading and async work required to analyze and
display a transaction, including building the transaction to bytes. This pattern guarantees that the
analysis that determines if a Transaction can be auto approved is run against a fully resolved
Transaction with fixed object versions, and will be the exact transaction that is eventually
executed. Co-locating all the data loading should also enable batching and caching of certain
lookups.

### The AutoApprovalManager

The AutoApprovalManager is the brain of the auto-approval system. It's a fully synchronous state
machine that manages everything related to auto-approvals for a specific application. When you
create a manager instance, you provide it with the application's policy and any previously saved
state for the application.

The manager handles policy evaluation, budget tracking, and user settings. The manager has a few
core methods:

- `getSettings()`: Gets the user's settings
- `updateSettings()`: Updates the user's settings
- `reset()`: Clears the user's settings and state
- `export()`: Exports the manager state as a string
- `checkTransaction(analysis)`: Checks the transaction against the application's policy and the
  user's settings, returning detailed information about any issues
- `commitTransaction(analysis)`: Updates the user's budgets and settings with the predicted effects
  of the transaction
- `revertTransaction(analysis)`: Reverts the changes from a commitTransaction
- `applyTransactionEffects(analysis, result)`: Reverts the predicted effects, and applies the real
  effects of a transaction

##### User Settings

The AutoApprovalManager maintains user settings, which are the user-configured preferences that
control when transactions can be auto-approved. The current settings include:

- **Approved Operations**: Which operation types from the policy can be auto-approved
- **Expiration**: When the auto-approval session expires (as a timestamp)
- **Remaining Transactions**: How many more transactions can be auto-approved (null for unlimited)
- **Coin Budgets**: Maximum amounts per coin type that can be spent (stored as string to handle
  large numbers)
- **Shared Budget**: Shared budget in a standardized currency (eg USD), this budget is only used
  when there is no specific budgets for a coinType.

<details>
<summary><b>Example: Settings Structure</b></summary>

```typescript
interface AutoApprovalSettings {
	approvedOperations: string[]; // ["gameplay", "marketplace"]
	expiration: number; // Unix timestamp
	remainingTransactions: number | null; // 100 or null for unlimited
	coinBudgets: Record<string, string>; // { "0x2::sui::SUI": "1000000000" }
	sharedBudget: number | null; // 12.34 or null to only support specific coin budgets
}
```

</details>

Settings are updated in three ways:

1. When users initially configure auto-approvals through the wallet UI
2. When users modify existing settings (changing limits, extending expiration)
3. Automatically modified when transactions are executed to adjust things like remaining
   transactions and budget

##### Persistence and Recovery

The manager's state should be persisted after making changes to settings, invoking methods like
`commitTransaction` or `applyTransactionEffects` that mutate th managers state. The `export()` and
constructor methods handle serialization and deserialization:

<details>
<summary><b>Example: State Persistence</b></summary>

```typescript
// Save state after any changes
function saveManagerState(manager: AutoApprovalManager, origin: string, network: string) {
	localStorage.setItem(`auto-approval-${origin}-${network}`, manager.export());
}

// Create manager with persisted state
const manager = new AutoApprovalManager({
	policy: policyJson,
	state: localStorage.getItem(`auto-approval-${origin}-${network}`),
});
```

</details>

<details>
<summary><b>Example: Complete Auto-Approval Flow</b></summary>

```typescript
async function handleTransactionRequest(
	request: WalletStandardSignRequest,
	manager: AutoApprovalManager,
	client: SuiClient,
) {
	// Step 1: Analyze the transaction
	const transactionJson = await request.transaction.toJSON();
	const analysis = await analyzeTransaction(client, transactionJson);

	// Step 2: Check auto-approval eligibility
	const check = manager.checkTransaction(analysis);

	// Step 3: Handle auto-approval if eligible
	if (check.canAutoApprove) {
		return await executeAutoApproval(manager, analysis, request.account);
	}

	// Step 4: Offer to configure/update settings if transaction matches policy
	if (check.matchesPolicy && !check.canAutoApprove) {
		const settings = await showSettingsDialog(
			manager.getState().policy,
			analysis.results.operationType,
			manager.getSettings(), // Pass existing settings, if set
		);

		if (settings) {
			manager.updateSettings(settings);
			saveManagerState(manager, origin, network);

			// Re-check with new settings
			const newCheck = manager.checkTransaction(analysis);
			if (newCheck.canAutoApprove) {
				return await executeAutoApproval(manager, analysis, request.account);
			}
		}
	}

	// Step 5: Fall back to manual approval
	return await showManualApprovalDialog(analysis, check);
}
```

</details>
