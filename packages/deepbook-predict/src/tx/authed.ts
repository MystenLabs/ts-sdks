import { accountMoveCalls as account } from '@mysten/deepbook-account';
import * as plp from '../contracts/deepbook_predict/plp.js';
import * as predictAccount from '../contracts/deepbook_predict/predict_account.js';
import { withAuth } from './common.js';

// Every owner-authorized single call in this SDK, declared rather than written: `withAuth`
// prepends the `generate_auth` command and fills the generated `auth` argument, so each of these
// takes exactly its generated options minus that slot. Command order is always auth → call, the
// call consuming the hot potato. The builder-code pair lives in the PREDICT package's
// `predict_account` module, not the account package.
export const depositFunds = withAuth(account.depositFunds);
export const withdrawFunds = withAuth(account.withdrawFunds);
export const requestSupply = withAuth(plp.requestSupply);
export const requestWithdraw = withAuth(plp.requestWithdraw);
export const cancelSupplyRequest = withAuth(plp.cancelSupplyRequest);
export const cancelWithdrawRequest = withAuth(plp.cancelWithdrawRequest);
export const setBuilderCode = withAuth(predictAccount.setBuilderCode);
export const unsetBuilderCode = withAuth(predictAccount.unsetBuilderCode);
