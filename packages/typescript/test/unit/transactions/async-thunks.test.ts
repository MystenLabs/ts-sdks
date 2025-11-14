// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '../../../src/transactions/Transaction.js';
import { bcs } from '../../../src/bcs/index.js';
import { Commands } from '../../../src/transactions/Commands.js';
import type { BuildTransactionOptions } from '../../../src/transactions/resolve.js';
import type { TransactionDataBuilder } from '../../../src/transactions/TransactionData.js';

const TEST_INTENT = 'TestIntent';

function testIntent() {
	return (tx: Transaction) => {
		tx.addIntentResolver(TEST_INTENT, resolveTestIntent);
		return tx.add(
			Commands.Intent({
				name: TEST_INTENT,
				inputs: {},
				data: {},
			}),
		);
	};
}

async function resolveTestIntent(
	transactionData: TransactionDataBuilder,
	_buildOptions: BuildTransactionOptions,
	next: () => Promise<void>,
) {
	for (let i = 0; i < transactionData.commands.length; i++) {
		const command = transactionData.commands[i];
		if (command.$kind === '$Intent' && command.$Intent.name === TEST_INTENT) {
			transactionData.replaceCommand(i, {
				$kind: 'MoveCall',
				MoveCall: {
					package: '0x1',
					module: 'test',
					function: 'test',
					typeArguments: [],
					arguments: [],
				},
			});
		}
	}

	await next();
}

describe('Transaction.add with async functions', () => {
	it('should handle adding object values', async () => {
		const transaction = new Transaction();
		const objAddress = '0x123';

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::get_object',
				arguments: [tx.object(objAddress)],
			});
		});

		transaction.transferObjects([result], '0x0');

		expect(await transaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "UnresolvedObject": {
			        "objectId": "0x0000000000000000000000000000000000000000000000000000000000000123"
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "get_object",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 0
			          }
			        ],
			        "address": {
			          "Input": 1
			        }
			      }
			    }
			  ]
			}"
		`);
	});

	it('should handle adding pure values', async () => {
		const transaction = new Transaction();
		const value = 42;

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::get_value',
				arguments: [tx.pure(bcs.U32.serialize(value))],
			});
		});

		transaction.transferObjects([result], '0x0');

		expect(await transaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "KgAAAA=="
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "get_value",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 0
			          }
			        ],
			        "address": {
			          "Input": 1
			        }
			      }
			    }
			  ]
			}"
		`);
	});

	it('should handle recursive add calls with sync functions', async () => {
		const transaction = new Transaction();
		const innerValue = 42;

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::outer',
				arguments: [
					tx.add((tx) => {
						return tx.moveCall({
							target: '0x1::test::inner',
							arguments: [tx.pure(bcs.U32.serialize(innerValue))],
						});
					}),
				],
			});
		});

		transaction.transferObjects([result], '0x0');

		expect(await transaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "KgAAAA=="
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "inner",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "outer",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 0
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 1
			          }
			        ],
			        "address": {
			          "Input": 1
			        }
			      }
			    }
			  ]
			}"
		`);
	});

	it('should handle recursive add calls with async functions', async () => {
		const transaction = new Transaction();
		const innerValue = 42;

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::outer_async',
				arguments: [
					tx.add(async (tx) => {
						return tx.moveCall({
							target: '0x1::test::inner_async',
							arguments: [tx.pure(bcs.U32.serialize(innerValue))],
						});
					}),
				],
			});
		});

		transaction.transferObjects([result], '0x0');

		expect(await transaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "KgAAAA=="
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "inner_async",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "outer_async",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 0
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 1
			          }
			        ],
			        "address": {
			          "Input": 1
			        }
			      }
			    }
			  ]
			}"
		`);
	});

	it('should handle intent resolvers added in async functions', async () => {
		const transaction = new Transaction();

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::with_intent',
				arguments: [testIntent()],
			});
		});

		transaction.transferObjects([result], '0x0');

		const json = await transaction.toJSON();
		expect(json).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "test",
			        "typeArguments": [],
			        "arguments": []
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "with_intent",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 0
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 1
			          }
			        ],
			        "address": {
			          "Input": 0
			        }
			      }
			    }
			  ]
			}"
		`);
	});

	it('should handle intent resolvers in recursive async adds', async () => {
		const transaction = new Transaction();

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::outer_with_intent',
				arguments: [
					tx.add(async (tx) => {
						return tx.moveCall({
							target: '0x1::test::inner_with_intent',
							arguments: [testIntent()],
						});
					}),
				],
			});
		});

		transaction.transferObjects([result], '0x0');

		const json = await transaction.toJSON();
		expect(json).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "test",
			        "typeArguments": [],
			        "arguments": []
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "inner_with_intent",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 0
			          }
			        ]
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "outer_with_intent",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 1
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 2
			          }
			        ],
			        "address": {
			          "Input": 0
			        }
			      }
			    }
			  ]
			}"
		`);
		// After resolution, both intents should be replaced with move calls
		const moveCallCount = (json.match(/MoveCall/g) || []).length;
		expect(moveCallCount).toBe(3);
	});

	it('should run async adds in parallel', async () => {
		const transaction = new Transaction();
		let firstCompleted = false;
		let secondCompleted = false;

		const result1 = transaction.add(async (tx) => {
			expect(secondCompleted).toBe(false); // But not completed yet
			await new Promise((resolve) => setTimeout(resolve, 100));
			firstCompleted = true;
			return tx.moveCall({
				target: '0x1::test::parallel_1',
				arguments: [tx.pure(bcs.U32.serialize(1))],
			});
		});

		const result2 = transaction.add(async (tx) => {
			expect(firstCompleted).toBe(false); // But not completed yet
			await new Promise((resolve) => setTimeout(resolve, 100));
			secondCompleted = true;
			return tx.moveCall({
				target: '0x1::test::parallel_2',
				arguments: [tx.pure(bcs.U32.serialize(2))],
			});
		});

		transaction.transferObjects([result1, result2], '0x0');

		expect(await transaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AQAAAA=="
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AgAAAA=="
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "parallel_1",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "parallel_2",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 1
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 0
			          },
			          {
			            "Result": 1
			          }
			        ],
			        "address": {
			          "Input": 2
			        }
			      }
			    }
			  ]
			}"
		`);
	});

	it('should handle errors in async functions', async () => {
		const transaction = new Transaction();
		const error = new Error('Test error');

		transaction.add(async () => {
			throw error;
		});

		await expect(transaction.toJSON()).rejects.toThrow('Test error');
	});

	it('should handle errors in recursive async adds', async () => {
		const transaction = new Transaction();
		const error = new Error('Test error');

		transaction.add(async (tx) => {
			tx.add(async () => {
				throw error;
			});
			return tx.moveCall({
				target: '0x1::test::error_test',
				arguments: [tx.pure(bcs.U32.serialize(1))],
			});
		});

		await expect(transaction.toJSON()).rejects.toThrow('Test error');
	});

	it('should deduplicate object inputs', async () => {
		const transaction = new Transaction();
		const objAddress = '0x123';

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::test',
				arguments: [
					tx.add(async (tx) => {
						return tx.moveCall({
							target: '0x1::test::test',
							arguments: [tx.object(objAddress)],
						});
					}),
					tx.add(async (tx) => {
						return tx.moveCall({
							target: '0x1::test::test',
							arguments: [tx.object(objAddress)],
						});
					}),
				],
			});
		});

		transaction.transferObjects([result], '0x0');

		expect(await transaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "UnresolvedObject": {
			        "objectId": "0x0000000000000000000000000000000000000000000000000000000000000123"
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "test",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "test",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "test",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 0
			          },
			          {
			            "Result": 1
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 2
			          }
			        ],
			        "address": {
			          "Input": 1
			        }
			      }
			    }
			  ]
			}"
		`);
	});

	it('should handle multiple recursive chains from root', async () => {
		const transaction = new Transaction();
		const value1 = 42;
		const value2 = 84;

		const result1 = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::chain1',
				arguments: [
					tx.add(async (tx) => {
						return tx.moveCall({
							target: '0x1::test::chain1_inner',
							arguments: [tx.pure(bcs.U32.serialize(value1))],
						});
					}),
				],
			});
		});

		const result2 = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::chain2',
				arguments: [
					tx.add(async (tx) => {
						return tx.moveCall({
							target: '0x1::test::chain2_inner',
							arguments: [tx.pure(bcs.U32.serialize(value2))],
						});
					}),
				],
			});
		});

		transaction.transferObjects([result1, result2], '0x0');

		expect(await transaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "KgAAAA=="
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "VAAAAA=="
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "chain1_inner",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "chain1",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 0
			          }
			        ]
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "chain2_inner",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 1
			          }
			        ]
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "chain2",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 2
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 1
			          },
			          {
			            "Result": 3
			          }
			        ],
			        "address": {
			          "Input": 2
			        }
			      }
			    }
			  ]
			}"
		`);
	});

	it('async add uses root transaction', async () => {
		const rootTransaction = new Transaction();

		const result = rootTransaction.add(async (innerTransaction) => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			const result1 = innerTransaction.moveCall({
				target: '0x1::test::add1',
			});

			return rootTransaction.add(async (tx) => {
				return tx.moveCall({
					target: '0x1::test::add2',
					arguments: [result1],
				});
			});
		});

		rootTransaction.transferObjects([result], '0x0');

		await expect(rootTransaction.toJSON()).rejects.toThrow(
			'Result { Result: 2 } is not available to use in the current transaction',
		);
	});

	it('sync transaction arguments', async () => {
		const tx = new Transaction();

		tx.add(async (tx) => {
			tx.moveCall({
				target: '0x1::test::root',
				arguments: [
					(tx) =>
						tx.moveCall({
							target: '0x1::test::inner',
						}),
				],
			});
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "inner",
			        "typeArguments": [],
			        "arguments": []
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "root",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 0
			          }
			        ]
			      }
			    }
			  ]
			}"
		`);
	});

	it('async transaction arguments', async () => {
		const tx = new Transaction();

		tx.moveCall({
			target: '0x1::test::root',
			arguments: [
				async (tx) => {
					await new Promise((resolve) => setTimeout(resolve, 100));
					return tx.moveCall({
						target: '0x1::test::inner',
					});
				},
			],
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "inner",
			        "typeArguments": [],
			        "arguments": []
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "root",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Result": 0
			          }
			        ]
			      }
			    }
			  ]
			}"
		`);
	});

	it('should allow mutation after building', async () => {
		const transaction = new Transaction();
		const objAddress = '0x123';

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::get_object',
				arguments: [tx.object(objAddress)],
			});
		});

		await transaction.toJSON();

		transaction.transferObjects([result], '0x0');

		transaction.moveCall({
			target: '0x1::test::another_call',
			arguments: [],
		});

		expect(await transaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "UnresolvedObject": {
			        "objectId": "0x0000000000000000000000000000000000000000000000000000000000000123"
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "get_object",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 0
			          }
			        ],
			        "address": {
			          "Input": 1
			        }
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "another_call",
			        "typeArguments": [],
			        "arguments": []
			      }
			    }
			  ]
			}"
		`);
	});

	it('should allow mutation after restoring with Transaction.from', async () => {
		const transaction = new Transaction();
		const objAddress = '0x123';

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::get_object',
				arguments: [tx.object(objAddress)],
			});
		});

		const json = await transaction.toJSON();

		const restoredTransaction = Transaction.from(json);

		restoredTransaction.transferObjects([result, result[1], { Result: 0 }], '0x0');

		restoredTransaction.moveCall({
			target: '0x1::test::another_call',
			arguments: [],
		});

		expect(await restoredTransaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "UnresolvedObject": {
			        "objectId": "0x0000000000000000000000000000000000000000000000000000000000000123"
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "get_object",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          }
			        ]
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 0
			          },
			          {
			            "NestedResult": [
			              0,
			              1
			            ]
			          },
			          {
			            "Result": 0
			          }
			        ],
			        "address": {
			          "Input": 1
			        }
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "another_call",
			        "typeArguments": [],
			        "arguments": []
			      }
			    }
			  ]
			}"
		`);
	});

	it('should allow mutation after restoring with Transaction.fromKind', async () => {
		const transaction = new Transaction();

		const result = transaction.add(async (tx) => {
			return tx.moveCall({
				target: '0x1::test::get_object',
				arguments: [],
			});
		});

		const bytes = await transaction.build({ onlyTransactionKind: true });

		const restoredTransaction = Transaction.fromKind(bytes);

		restoredTransaction.transferObjects([result, result[1], { Result: 0 }], '0x0');

		restoredTransaction.moveCall({
			target: '0x1::test::another_call',
			arguments: [],
		});

		expect(await restoredTransaction.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "get_object",
			        "typeArguments": [],
			        "arguments": []
			      }
			    },
			    {
			      "TransferObjects": {
			        "objects": [
			          {
			            "Result": 0
			          },
			          {
			            "NestedResult": [
			              0,
			              1
			            ]
			          },
			          {
			            "Result": 0
			          }
			        ],
			        "address": {
			          "Input": 0
			        }
			      }
			    },
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "module": "test",
			        "function": "another_call",
			        "typeArguments": [],
			        "arguments": []
			      }
			    }
			  ]
			}"
		`);
	});
});
