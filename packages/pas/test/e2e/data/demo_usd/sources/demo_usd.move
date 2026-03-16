// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Demo USD asset for testing the PAS SDK.
///
/// This module defines a DEMO_USD witness type that gets registered in the PAS system
/// during package initialization. It sets up a Policy with resolution commands for
/// SendFunds and UnlockFunds actions.
module demo_usd::demo_usd;

use pas::namespace::Namespace;
use pas::policy::{Self, Policy, PolicyCap};
use pas::request::Request;
use pas::send_funds::SendFunds;
use pas::templates::{PAS, Templates};
use ptb::ptb;
use std::type_name;
use sui::balance::Balance;
use sui::clock::Clock;
use sui::coin::TreasuryCap;
use sui::coin_registry::{Self, MetadataCap};

#[error(code = 0)]
const EInvalidAmount: vector<u8> = b"Any amount over 10K is not allowed in this demo.";
#[error(code = 1)]
const ECannotSelfTransfer: vector<u8> =
  b"Transfers cannot be made to the same address as the sender.";
#[error(code = 2)]
const ENotAllowedRecipient: vector<u8> =
  b"Transfers to the address 0x2 are not allowed in this demo.";

/// One-time witness for the demo_usd package
public struct DEMO_USD has drop {}

/// Create a 'faucet' to allow free mints for testing
public struct Faucet has key {
  id: UID,
  cap: TreasuryCap<DEMO_USD>,
  metadata: MetadataCap<DEMO_USD>,
  policy_cap: Option<PolicyCap<Balance<DEMO_USD>>>,
}

/// Stamp used in PAS for authorizing any admin action.
public struct ActionStamp() has drop;

public struct TransferApproval() has drop;
public struct TransferApprovalV2() has drop;

public struct UnlockApproval() has drop;

public fun faucet_mint_balance(faucet: &mut Faucet, amount: u64): Balance<DEMO_USD> {
  faucet.cap.mint_balance(amount)
}

/// Package initialization - creates DEMO_USD currency
fun init(otw: DEMO_USD, ctx: &mut TxContext) {
  let (initializer, cap) = coin_registry::new_currency_with_otw(
    otw,
    6,
    b"DEMO_USD".to_string(),
    b"Demo USD".to_string(),
    b"Demo USD for testing".to_string(),
    b"https://demo.usd".to_string(),
    ctx,
  );

  let metadata = initializer.finalize(ctx);

  transfer::share_object(Faucet {
    id: object::new(ctx),
    cap,
    metadata,
    policy_cap: option::none(),
  });
}

/// Resolver function for transfer requests - simply approves all transfers
public fun approve_transfer<T>(request: &mut Request<SendFunds<Balance<T>>>, _clock: &Clock) {
  // We only allow transfers with value less than 10K.
  // NOTE: This is only for testing, this is not really enforceable like this as you could batch multiple in a PTB.
  assert!(request.data().funds().value() < 10_000 * 1_000_000, EInvalidAmount);
  assert!(request.data().sender() != request.data().recipient(), ECannotSelfTransfer);

  request.approve(TransferApproval());
}

entry fun setup(namespace: &mut Namespace, templates: &mut Templates, faucet: &mut Faucet) {
  let (mut policy, cap) = policy::new_for_currency(namespace, &mut faucet.cap, true);

  policy.set_required_approval<_, TransferApproval>(&cap, "send_funds");

  faucet.policy_cap.fill(cap);

  let type_name = type_name::with_defining_ids<DEMO_USD>();

  let cmd = ptb::move_call(
    type_name.address_string().to_string(),
    "demo_usd",
    "approve_transfer",
    vector[ptb::ext_input<PAS>("request"), ptb::object_by_id(@0x6.to_id())],
    vector[(*type_name.as_string()).to_string()],
  );

  templates.set_template_command(internal::permit<TransferApproval>(), cmd);
  policy.share();
}

/// starts using v2 approve transfer to test upgradeability.
public fun use_v2(
  policy: &mut Policy<Balance<DEMO_USD>>,
  templates: &mut Templates,
  faucet: &mut Faucet,
) {
  let cmd = ptb::move_call(
    type_name::with_defining_ids<DEMO_USD>().address_string().to_string(),
    "demo_usd",
    "approve_transfer_v2",
    vector[ptb::ext_input<PAS>("request"), ptb::object_by_id(object::id(faucet))],
    vector[],
  );

  templates.set_template_command(internal::permit<TransferApprovalV2>(), cmd);

  policy.set_required_approval<_, TransferApprovalV2>(
    faucet.policy_cap.borrow(),
    "send_funds",
  );
}

/// V2 function allows all transfers, besides transferring to 0x2.
public fun approve_transfer_v2(
  request: &mut Request<SendFunds<Balance<DEMO_USD>>>,
  _faucet: &Faucet,
) {
  assert!(request.data().recipient() != @0x2, ENotAllowedRecipient);
  request.approve(TransferApprovalV2());
}
