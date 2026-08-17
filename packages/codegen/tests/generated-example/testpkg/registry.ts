/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/** A registry module with generics, enums, and various function visibilities. */

import { MoveStruct, MoveEnum, normalizeMoveArguments, type RawTransactionArgument, type ConfigValue, type ConfigResolverContext, type ConfigObjectValue } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction, type TransactionObjectArgument, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@test/testpkg::registry';
export const Container = new MoveStruct({ name: `${$moduleName}::Container<phantom T>`, fields: {
        id: bcs.Address,
        size: bcs.u64()
    } });
export const Registry = new MoveStruct({ name: `${$moduleName}::Registry`, fields: {
        id: bcs.Address,
        count: bcs.u64()
    } });
/** Status enum with unit, named-field, and mixed variants. */
export const Status = new MoveEnum({ name: `${$moduleName}::Status`, fields: {
        Active: null,
        Inactive: null,
        Pending: new MoveStruct({ name: `Status.Pending`, fields: {
                reason: bcs.string()
            } })
    } });
export const Entry = new MoveStruct({ name: `${$moduleName}::Entry`, fields: {
        name: bcs.string(),
        owner: bcs.Address,
        status: Status,
        tags: bcs.vector(bcs.string())
    } });
export const EntryRegistered = new MoveStruct({ name: `${$moduleName}::EntryRegistered`, fields: {
        registry_id: bcs.Address,
        name: bcs.string()
    } });
/** Generic enum. */
export function Result<T extends BcsType<any>>(...typeParameters: [
    T
]) {
    return new MoveEnum({ name: `${$moduleName}::Result<${typeParameters[0].name as T['name']}>`, fields: {
            Ok: new MoveStruct({ name: `Result.Ok`, fields: {
                    value: typeParameters[0]
                } }),
            Err: new MoveStruct({ name: `Result.Err`, fields: {
                    code: bcs.u64(),
                    message: bcs.string()
                } })
        } });
}
/** Enum with phantom type parameter (becomes a const, not a function). */
export const PhantomResult = new MoveEnum({ name: `${$moduleName}::PhantomResult<phantom T>`, fields: {
        Success: null,
        Failure: new MoveStruct({ name: `PhantomResult.Failure`, fields: {
                code: bcs.u64()
            } })
    } });
/** Enum with phantom first, non-phantom second (tests index remapping). */
export function MixedResult<V extends BcsType<any>>(...typeParameters: [
    V
]) {
    return new MoveEnum({ name: `${$moduleName}::MixedResult<phantom T, ${typeParameters[0].name as V['name']}>`, fields: {
            Ok: new MoveStruct({ name: `MixedResult.Ok`, fields: {
                    value: typeParameters[0]
                } }),
            Err: new MoveStruct({ name: `MixedResult.Err`, fields: {
                    code: bcs.u64()
                } })
        } });
}
export interface RegisterArguments {
    registry?: RawTransactionArgument<string>;
    name: RawTransactionArgument<string>;
    tags: RawTransactionArgument<Array<string>>;
}
export interface RegisterOptions {
    package?: string;
    arguments: RegisterArguments;
    config?: {
        registry: ConfigValue;
        testpkgPackageId?: string;
    };
}
/** Register a new entry (public entry). */
export function register(options: RegisterOptions) {
    const packageAddress = options.package ?? options.config?.testpkgPackageId ?? '@test/testpkg';
    const argumentsTypes = [
        null,
        '0x1::string::String',
        'vector<0x1::string::String>'
    ] satisfies (string | null)[];
    const parameterNames = ["registry", "name", "tags"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'register',
        arguments: normalizeMoveArguments({
            ...options.arguments,
            registry: options.arguments?.registry ?? options.config?.registry
        }, argumentsTypes, parameterNames),
    });
}
export interface LookupArguments {
    registry?: RawTransactionArgument<string>;
}
export interface LookupOptions {
    package?: string;
    arguments?: LookupArguments;
    config?: {
        registry: ConfigValue;
        testpkgPackageId?: string;
    };
}
/** Look up an entry count. */
export function lookup(options: LookupOptions) {
    const packageAddress = options.package ?? options.config?.testpkgPackageId ?? '@test/testpkg';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["registry"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'lookup',
        arguments: normalizeMoveArguments({
            ...options.arguments,
            registry: options.arguments?.registry ?? options.config?.registry
        }, argumentsTypes, parameterNames),
    });
}
export interface NewContainerOptions {
    package?: string;
    arguments?: [
    ];
    config?: {
        testpkgPackageId?: string;
    };
    typeArguments: [
        string
    ];
}
/** Create a new container with a type parameter. */
export function newContainer(options: NewContainerOptions) {
    const packageAddress = options.package ?? options.config?.testpkgPackageId ?? '@test/testpkg';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'new_container',
        typeArguments: options.typeArguments
    });
}
export interface ContainerSizeArguments {
    container?: RawTransactionArgument<string>;
}
export interface ContainerSizeOptions {
    package?: string;
    arguments?: ContainerSizeArguments;
    config?: {
        container: (ctx: ConfigResolverContext) => string | TransactionObjectArgument;
        testpkgPackageId?: string;
    };
    typeArguments: [
        string
    ];
}
/** Get the container size. */
export function containerSize(options: ContainerSizeOptions) {
    const packageAddress = options.package ?? options.config?.testpkgPackageId ?? '@test/testpkg';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["container"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'container_size',
        arguments: normalizeMoveArguments({
            ...options.arguments,
            container: options.arguments?.container ?? options.config?.container?.({ typeArguments: [`${options.typeArguments[0]}`], packageAddress, moduleName: 'registry', functionName: 'container_size', parameterName: "container", parameterIndex: 0 })
        }, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface MigrateArguments {
    registry?: RawTransactionArgument<string>;
    newCount: RawTransactionArgument<number | bigint>;
}
export interface MigrateOptions {
    package?: string;
    arguments: MigrateArguments;
    config?: {
        registry: ConfigValue;
        testpkgPackageId?: string;
    };
}
/** Migrate data (private entry). */
export function migrate(options: MigrateOptions) {
    const packageAddress = options.package ?? options.config?.testpkgPackageId ?? '@test/testpkg';
    const argumentsTypes = [
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["registry", "newCount"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'migrate',
        arguments: normalizeMoveArguments({
            ...options.arguments,
            registry: options.arguments?.registry ?? options.config?.registry
        }, argumentsTypes, parameterNames),
    });
}
export interface IsActiveArguments {
    status?: TransactionArgument;
}
export interface IsActiveOptions {
    package?: string;
    arguments?: IsActiveArguments;
    config?: {
        status: ConfigObjectValue;
        testpkgPackageId?: string;
    };
}
/** Check if status is active (takes enum param). */
export function isActive(options: IsActiveOptions) {
    const packageAddress = options.package ?? options.config?.testpkgPackageId ?? '@test/testpkg';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["status"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'is_active',
        arguments: normalizeMoveArguments({
            ...options.arguments,
            status: options.arguments?.status ?? options.config?.status
        }, argumentsTypes, parameterNames),
    });
}
export interface OkResultArguments<T extends BcsType<any>> {
    value: RawTransactionArgument<T>;
}
export interface OkResultOptions<T extends BcsType<any>> {
    package?: string;
    arguments: OkResultArguments<T> | [
        value: RawTransactionArgument<T>
    ];
    config?: {
        testpkgPackageId?: string;
    };
    typeArguments: [
        string
    ];
}
/** Function that returns a generic enum. */
export function okResult<T extends BcsType<any>>(options: OkResultOptions<T>) {
    const packageAddress = options.package ?? options.config?.testpkgPackageId ?? '@test/testpkg';
    const argumentsTypes = [
        `${options.typeArguments[0]}`
    ] satisfies (string | null)[];
    const parameterNames = ["value"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'ok_result',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}