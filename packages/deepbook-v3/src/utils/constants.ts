// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Coin, Pool, MarginPool } from '../types/index.js';

export type CoinMap = Record<string, Coin>;
export type PoolMap = Record<string, Pool>;
export type MarginPoolMap = Record<string, MarginPool>;
export interface DeepbookPackageIds {
	DEEPBOOK_PACKAGE_ID: string;
	REGISTRY_ID: string;
	DEEP_TREASURY_ID: string;
	MARGIN_PACKAGE_ID: string;
	MARGIN_REGISTRY_ID: string;
}

export const testnetPackageIds = {
	DEEPBOOK_PACKAGE_ID: '0x926c446869fa175ec3b0dbf6c4f14604d86a415c1fccd8c8f823cfc46a29baed',
	REGISTRY_ID: '0x7c256edbda983a2cd6f946655f4bf3f00a41043993781f8674a7046e8c0e11d1',
	DEEP_TREASURY_ID: '0x69fffdae0075f8f71f4fa793549c11079266910e8905169845af1f5d00e09dcb',
	MARGIN_PACKAGE_ID: '0xf978cf2b601c24e40ef82b6e51512b448696b44cb014c0a1162422aa8b9cb811',
	MARGIN_REGISTRY_ID: '0x48d7640dfae2c6e9ceeada197a7a1643984b5a24c55a0c6c023dac77e0339f75',
} satisfies DeepbookPackageIds;

export const mainnetPackageIds = {
	DEEPBOOK_PACKAGE_ID: '0x00c1a56ec8c4c623a848b2ed2f03d23a25d17570b670c22106f336eb933785cc',
	REGISTRY_ID: '0xaf16199a2dff736e9f07a845f23c5da6df6f756eddb631aed9d24a93efc4549d',
	DEEP_TREASURY_ID: '0x032abf8948dda67a271bcc18e776dbbcfb0d58c8d288a700ff0d5521e57a1ffe',
	MARGIN_PACKAGE_ID: '',
	MARGIN_REGISTRY_ID: '',
} satisfies DeepbookPackageIds;

export const testnetCoins: CoinMap = {
	DEEP: {
		address: `0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8`,
		type: `0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP`,
		scalar: 1000000,
		feed: '0xe18bf5fa857d5ca8af1f6a458b26e853ecdc78fc2f3dc17f4821374ad94d8327',
		currencyId: '0xbf1b77e244f649c736a44898585cc8ac939fbb0bbdf1d8d2a183978cc312e613',
		priceInfoObjectId: '0xa98cbb7a97b4ce306eafdbc52a602578dea25165e6578fe6603caeb002fe02aa',
	},
	SUI: {
		address: `0x0000000000000000000000000000000000000000000000000000000000000002`,
		type: `0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI`,
		scalar: 1000000000,
		feed: '0x50c67b3fd225db8912a424dd4baed60ffdde625ed2feaaf283724f9608fea266',
		currencyId: '',
		priceInfoObjectId: '0x1ebb295c789cc42b3b2a1606482cd1c7124076a0f5676718501fda8c7fd075a0',
	},
	DBUSDC: {
		address: `0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7`,
		type: `0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC`,
		scalar: 1000000,
		feed: '0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722',
		currencyId: '0x509db0f9283c9ee4fdc5b99028a439d3639f49e9709e3d7a6de14b3bfdb0c784',
		priceInfoObjectId: '0x9c4dd4008297ffa5e480684b8100ec21cc934405ed9a25d4e4d7b6259aad9c81',
	},
	DBTC: {
		address: `0x6502dae813dbe5e42643c119a6450a518481f03063febc7e20238e43b6ea9e86`,
		type: `0x6502dae813dbe5e42643c119a6450a518481f03063febc7e20238e43b6ea9e86::dbtc::DBTC`,
		scalar: 100000000,
		feed: '0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b',
		currencyId: '0x3ef2afa2126704bf721b9c8495d94288f6bd090fc454fe3e1613eb765a8a348f',
		priceInfoObjectId: '',
	},
	DBUSDT: {
		address: `0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7`,
		type: `0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDT::DBUSDT`,
		scalar: 1000000,
	},
	WAL: {
		address: `0x9ef7676a9f81937a52ae4b2af8d511a28a0b080477c0c2db40b0ab8882240d76`,
		type: `0x9ef7676a9f81937a52ae4b2af8d511a28a0b080477c0c2db40b0ab8882240d76::wal::WAL`,
		scalar: 1000000000,
	},
};

export const mainnetCoins: CoinMap = {
	DEEP: {
		address: `0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270`,
		type: `0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP`,
		scalar: 1000000,
	},
	SUI: {
		address: `0x0000000000000000000000000000000000000000000000000000000000000002`,
		type: `0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI`,
		scalar: 1000000000,
		feed: '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
		currencyId: '',
	},
	USDC: {
		address: `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7`,
		type: `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`,
		scalar: 1000000,
		feed: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
		currencyId: '',
	},
	WUSDC: {
		address: `0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf`,
		type: `0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN`,
		scalar: 1000000,
	},
	WETH: {
		address: `0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5`,
		type: `0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN`,
		scalar: 100000000,
	},
	BETH: {
		address: `0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29`,
		type: `0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH`,
		scalar: 100000000,
	},
	WBTC: {
		address: `0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881`,
		type: `0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN`,
		scalar: 100000000,
	},
	WUSDT: {
		address: `0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c`,
		type: `0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN`,
		scalar: 1000000,
	},
	NS: {
		address: `0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178`,
		type: `0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS`,
		scalar: 1000000,
	},
	TYPUS: {
		address: `0xf82dc05634970553615eef6112a1ac4fb7bf10272bf6cbe0f80ef44a6c489385`,
		type: `0xf82dc05634970553615eef6112a1ac4fb7bf10272bf6cbe0f80ef44a6c489385::typus::TYPUS`,
		scalar: 1000000000,
	},
	AUSD: {
		address: `0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2`,
		type: `0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD`,
		scalar: 1000000,
	},
	DRF: {
		address: `0x294de7579d55c110a00a7c4946e09a1b5cbeca2592fbb83fd7bfacba3cfeaf0e`,
		type: `0x294de7579d55c110a00a7c4946e09a1b5cbeca2592fbb83fd7bfacba3cfeaf0e::drf::DRF`,
		scalar: 1000000,
	},
	SEND: {
		address: `0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7`,
		type: `0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND`,
		scalar: 1000000,
	},
	WAL: {
		address: `0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59`,
		type: `0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL`,
		scalar: 1000000000,
	},
	XBTC: {
		address: `0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50`,
		type: `0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC`,
		scalar: 100000000,
	},
	IKA: {
		address: `0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa`,
		type: `0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA`,
		scalar: 1000000000,
	},
	ALKIMI: {
		address: `0x1a8f4bc33f8ef7fbc851f156857aa65d397a6a6fd27a7ac2ca717b51f2fd9489`,
		type: `0x1a8f4bc33f8ef7fbc851f156857aa65d397a6a6fd27a7ac2ca717b51f2fd9489::alkimi::ALKIMI`,
		scalar: 1000000000,
	},
	// This coin is experimental
	WGIGA: {
		address: `0xec32640add6d02a1d5f0425d72705eb76d9de7edfd4f34e0dba68e62ecceb05b`,
		type: `0xec32640add6d02a1d5f0425d72705eb76d9de7edfd4f34e0dba68e62ecceb05b::coin::COIN`,
		scalar: 100000,
	},
};

export const testnetPools: PoolMap = {
	DEEP_SUI: {
		address: `0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f`,
		baseCoin: 'DEEP',
		quoteCoin: 'SUI',
	},
	SUI_DBUSDC: {
		address: `0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5`,
		baseCoin: 'SUI',
		quoteCoin: 'DBUSDC',
	},
	DEEP_DBUSDC: {
		address: `0xe86b991f8632217505fd859445f9803967ac84a9d4a1219065bf191fcb74b622`,
		baseCoin: 'DEEP',
		quoteCoin: 'DBUSDC',
	},
	DBUSDT_DBUSDC: {
		address: `0x83970bb02e3636efdff8c141ab06af5e3c9a22e2f74d7f02a9c3430d0d10c1ca`,
		baseCoin: 'DBUSDT',
		quoteCoin: 'DBUSDC',
	},
	WAL_DBUSDC: {
		address: `0xeb524b6aea0ec4b494878582e0b78924208339d360b62aec4a8ecd4031520dbb`,
		baseCoin: 'WAL',
		quoteCoin: 'DBUSDC',
	},
	WAL_SUI: {
		address: `0x8c1c1b186c4fddab1ebd53e0895a36c1d1b3b9a77cd34e607bef49a38af0150a`,
		baseCoin: 'WAL',
		quoteCoin: 'SUI',
	},
	DBTC_DBUSDC: {
		address: `0x0dce0aa771074eb83d1f4a29d48be8248d4d2190976a5241f66b43ec18fa34de`,
		baseCoin: 'DBTC',
		quoteCoin: 'DBUSDC',
	},
};

export const mainnetPools: PoolMap = {
	DEEP_SUI: {
		address: `0xb663828d6217467c8a1838a03793da896cbe745b150ebd57d82f814ca579fc22`,
		baseCoin: 'DEEP',
		quoteCoin: 'SUI',
	},
	SUI_USDC: {
		address: `0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407`,
		baseCoin: 'SUI',
		quoteCoin: 'USDC',
	},
	DEEP_USDC: {
		address: `0xf948981b806057580f91622417534f491da5f61aeaf33d0ed8e69fd5691c95ce`,
		baseCoin: 'DEEP',
		quoteCoin: 'USDC',
	},
	WUSDT_USDC: {
		address: `0x4e2ca3988246e1d50b9bf209abb9c1cbfec65bd95afdacc620a36c67bdb8452f`,
		baseCoin: 'WUSDT',
		quoteCoin: 'USDC',
	},
	WUSDC_USDC: {
		address: `0xa0b9ebefb38c963fd115f52d71fa64501b79d1adcb5270563f92ce0442376545`,
		baseCoin: 'WUSDC',
		quoteCoin: 'USDC',
	},
	BETH_USDC: {
		address: `0x1109352b9112717bd2a7c3eb9a416fff1ba6951760f5bdd5424cf5e4e5b3e65c`,
		baseCoin: 'BETH',
		quoteCoin: 'USDC',
	},
	NS_USDC: {
		address: `0x0c0fdd4008740d81a8a7d4281322aee71a1b62c449eb5b142656753d89ebc060`,
		baseCoin: 'NS',
		quoteCoin: 'USDC',
	},
	NS_SUI: {
		address: `0x27c4fdb3b846aa3ae4a65ef5127a309aa3c1f466671471a806d8912a18b253e8`,
		baseCoin: 'NS',
		quoteCoin: 'SUI',
	},
	TYPUS_SUI: {
		address: `0xe8e56f377ab5a261449b92ac42c8ddaacd5671e9fec2179d7933dd1a91200eec`,
		baseCoin: 'TYPUS',
		quoteCoin: 'SUI',
	},
	SUI_AUSD: {
		address: `0x183df694ebc852a5f90a959f0f563b82ac9691e42357e9a9fe961d71a1b809c8`,
		baseCoin: 'SUI',
		quoteCoin: 'AUSD',
	},
	AUSD_USDC: {
		address: `0x5661fc7f88fbeb8cb881150a810758cf13700bb4e1f31274a244581b37c303c3`,
		baseCoin: 'AUSD',
		quoteCoin: 'USDC',
	},
	DRF_SUI: {
		address: `0x126865a0197d6ab44bfd15fd052da6db92fd2eb831ff9663451bbfa1219e2af2`,
		baseCoin: 'DRF',
		quoteCoin: 'SUI',
	},
	SEND_USDC: {
		address: `0x1fe7b99c28ded39774f37327b509d58e2be7fff94899c06d22b407496a6fa990`,
		baseCoin: 'SEND',
		quoteCoin: 'USDC',
	},
	WAL_USDC: {
		address: `0x56a1c985c1f1123181d6b881714793689321ba24301b3585eec427436eb1c76d`,
		baseCoin: 'WAL',
		quoteCoin: 'USDC',
	},
	WAL_SUI: {
		address: `0x81f5339934c83ea19dd6bcc75c52e83509629a5f71d3257428c2ce47cc94d08b`,
		baseCoin: 'WAL',
		quoteCoin: 'SUI',
	},
	XBTC_USDC: {
		address: `0x20b9a3ec7a02d4f344aa1ebc5774b7b0ccafa9a5d76230662fdc0300bb215307`,
		baseCoin: 'XBTC',
		quoteCoin: 'USDC',
	},
	IKA_USDC: {
		address: `0xfa732993af2b60d04d7049511f801e79426b2b6a5103e22769c0cead982b0f47`,
		baseCoin: 'IKA',
		quoteCoin: 'USDC',
	},
	ALKIMI_SUI: {
		address: `0x84752993c6dc6fce70e25ddeb4daddb6592d6b9b0912a0a91c07cfff5a721d89`,
		baseCoin: 'ALKIMI',
		quoteCoin: 'SUI',
	},
};

export const testnetMarginPools = {
	SUI: {
		address: '0xcdbbe6a72e639b647296788e2e4b1cac5cea4246028ba388ba1332ff9a382eea',
		type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	},
	DBUSDC: {
		address: '0xf08568da93834e1ee04f09902ac7b1e78d3fdf113ab4d2106c7265e95318b14d',
		type: '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC',
	},
	DEEP: {
		address: '0x610640613f21d9e688d6f8103d17df22315c32e0c80590ce64951a1991378b55',
		type: '0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP',
	},
	DBTC: {
		address: '0xf3440b4aafcc8b12fc4b242e9590c52873b8238a0d0e52fbf9dae61d2970796a',
		type: '0x6502dae813dbe5e42643c119a6450a518481f03063febc7e20238e43b6ea9e86::dbtc::DBTC',
	},
};

export const mainnetMarginPools = {
	SUI: {
		address: '',
		type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	},
	USDC: {
		address: '',
		type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
	},
	DEEP: {
		address: '',
		type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
	},
};

export const testnetPythConfigs = {
	pythStateId: '0x243759059f4c3111179da5878c12f68d612c21a8d54d85edc86164bb18be1c7c',
	wormholeStateId: '0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790',
};

export const mainnetPythConfigs = {
	pythStateId: '0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8',
	wormholeStateId: '0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c',
};
