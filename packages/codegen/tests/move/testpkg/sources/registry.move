/// A registry module with generics, enums, and various function visibilities.
#[allow(unused_field, unused_variable, unused_function)]
module testpkg::registry {
    use std::string::String;

    /// Status enum with unit, named-field, and mixed variants.
    public enum Status has copy, drop, store {
        Active,
        Inactive,
        Pending { reason: String },
    }

    /// Generic enum.
    public enum Result<T: copy + drop + store> has copy, drop, store {
        Ok { value: T },
        Err { code: u64, message: String },
    }

    /// Enum with phantom type parameter (becomes a const, not a function).
    public enum PhantomResult<phantom T> has copy, drop, store {
        Success,
        Failure { code: u64 },
    }

    /// Enum with phantom first, non-phantom second (tests index remapping).
    public enum MixedResult<phantom T, V: copy + drop + store> has copy, drop, store {
        Ok { value: V },
        Err { code: u64 },
    }

    /// A generic container with a phantom type parameter.
    public struct Container<phantom T> has key, store {
        id: UID,
        size: u64,
    }

    /// A registry object.
    public struct Registry has key {
        id: UID,
        count: u64,
    }

    /// A registry entry with various field types.
    public struct Entry has store, drop {
        name: String,
        owner: address,
        status: Status,
        tags: vector<String>,
    }

    /// Event for entry registration.
    public struct EntryRegistered has copy, drop {
        registry_id: ID,
        name: String,
    }

    /// Register a new entry (public entry).
    public entry fun register(
        registry: &mut Registry,
        name: String,
        tags: vector<String>,
        ctx: &TxContext,
    ) {
        registry.count = registry.count + 1;
        sui::event::emit(EntryRegistered {
            registry_id: object::id(registry),
            name,
        });
    }

    /// Look up an entry count.
    public fun lookup(registry: &Registry): u64 {
        registry.count
    }

    /// Create a new container with a type parameter.
    public fun new_container<T>(ctx: &mut TxContext): Container<T> {
        Container {
            id: object::new(ctx),
            size: 0,
        }
    }

    /// Get the container size.
    public fun container_size<T>(container: &Container<T>): u64 {
        container.size
    }

    /// Admin delete (private, not entry).
    fun admin_delete(registry: &mut Registry) {
        registry.count = 0;
    }

    /// Migrate data (private entry).
    entry fun migrate(registry: &mut Registry, new_count: u64) {
        registry.count = new_count;
    }

    /// Check if status is active (takes enum param).
    public fun is_active(status: &Status): bool {
        match (status) {
            Status::Active => true,
            _ => false,
        }
    }

    /// Function that returns a generic enum.
    public fun ok_result<T: copy + drop + store>(value: T): Result<T> {
        Result::Ok { value }
    }
}
