/// A counter module used for codegen testing.
/// Contains structs with all primitive types, Options, vectors, IDs, and various function visibilities.
#[allow(unused_field, unused_function)]
module testpkg::counter {
    use std::string::String;
    use std::ascii;
    use sui::clock::Clock;

    /// A simple counter object.
    public struct Counter has key {
        id: UID,
        value: u64,
        owner: address,
    }

    /// Admin capability for managing counters.
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Event emitted when a counter is created.
    public struct CounterCreated has copy, drop {
        counter_id: ID,
        initial_value: u64,
    }

    /// Covers all primitive field types.
    public struct Primitives has copy, drop, store {
        val_bool: bool,
        val_u8: u8,
        val_u16: u16,
        val_u32: u32,
        val_u64: u64,
        val_u128: u128,
        val_u256: u256,
        val_address: address,
    }

    /// Covers string, vector, option, and object-id field types.
    public struct Composites has copy, drop, store {
        val_string: String,
        val_ascii_string: ascii::String,
        val_id: ID,
        val_vector_u8: vector<u8>,
        val_vector_u64: vector<u64>,
        val_vector_bool: vector<bool>,
        val_vector_address: vector<address>,
        val_vector_string: vector<String>,
        val_nested_vector: vector<vector<u8>>,
        val_option_u64: Option<u64>,
        val_option_string: Option<String>,
        val_option_id: Option<ID>,
        val_option_bool: Option<bool>,
        val_vector_option: vector<Option<u64>>,
    }

    /// Generic struct with a non-phantom type parameter.
    public struct Wrapper<T: store> has key, store {
        id: UID,
        value: T,
    }

    /// Generic struct with multiple type parameters, mixing phantom and non-phantom.
    public struct Pair<T: store, phantom U> has key, store {
        id: UID,
        first: T,
    }

    /// Create a new counter (public entry).
    public entry fun create(ctx: &mut TxContext) {
        let counter = Counter {
            id: object::new(ctx),
            value: 0,
            owner: ctx.sender(),
        };
        let id = object::id(&counter);
        sui::event::emit(CounterCreated { counter_id: id, initial_value: 0 });
        transfer::share_object(counter);
    }

    /// Increment the counter by 1 (public, mutable ref).
    public fun increment(counter: &mut Counter) {
        counter.value = counter.value + 1;
    }

    /// Get the current value (public, immutable ref).
    public fun value(counter: &Counter): u64 {
        counter.value
    }

    /// Set the counter to a specific value (public, takes u64 arg).
    public fun set_value(counter: &mut Counter, new_value: u64) {
        counter.value = new_value;
    }

    /// Function that uses a well-known object parameter (Clock).
    public fun value_with_clock(counter: &Counter, clock: &Clock): u64 {
        counter.value
    }

    /// Function with Option parameters.
    public fun set_optional(counter: &mut Counter, new_value: Option<u64>) {
        if (new_value.is_some()) {
            counter.value = new_value.destroy_some();
        };
    }

    /// Function with vector parameter.
    public fun batch_set(counter: &mut Counter, values: vector<u64>) {
        if (!values.is_empty()) {
            counter.value = values[values.length() - 1];
        };
    }

    /// Function with generic type parameters.
    public fun wrap<T: store>(value: T, ctx: &mut TxContext): Wrapper<T> {
        Wrapper {
            id: object::new(ctx),
            value,
        }
    }

    /// Function with multiple generic type parameters.
    public fun create_pair<T: store, U>(first: T, ctx: &mut TxContext): Pair<T, U> {
        Pair {
            id: object::new(ctx),
            first,
        }
    }

    /// Function with multiple return values.
    public fun get_value_and_owner(counter: &Counter): (u64, address) {
        (counter.value, counter.owner)
    }

    /// Reset the counter (private entry function).
    entry fun reset(counter: &mut Counter) {
        counter.value = 0;
    }

    /// Destroy the counter (private, not entry).
    fun destroy(counter: Counter) {
        let Counter { id, value: _, owner: _ } = counter;
        object::delete(id);
    }
}
