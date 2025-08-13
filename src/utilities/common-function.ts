import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { sendToQueue } from './amqp';
import { createLogger } from './logger';
import { AccountsResult, BetsData, PlayerDetails, WebhookData, WebhookKey } from '../interfaces';
const thirdPartyLogger = createLogger('ThirdPartyRequest', 'jsonl');
const failedThirdPartyLogger = createLogger('FailedThirdPartyRequest', 'jsonl');

export const generateUUIDv7 = (): string => {
    const timestamp = Date.now();
    const timeHex = timestamp.toString(16).padStart(12, '0');
    const randomBits = crypto.randomBytes(8).toString('hex').slice(2);
    const uuid = [
        timeHex.slice(0, 8),
        timeHex.slice(8) + randomBits.slice(0, 4),
        '7' + randomBits.slice(4, 7),
        (parseInt(randomBits.slice(7, 8), 16) & 0x3f | 0x80).toString(16) + randomBits.slice(8, 12),
        randomBits.slice(12)
    ];

    return uuid.join('-');
}



export const updateBalanceFromAccount = async (data: BetsData, key: WebhookKey, playerDetails: PlayerDetails): Promise<AccountsResult> => {
    try {
    
        const webhookData = await prepareDataForWebhook({ ...data, game_id: playerDetails.game_id }, key);
        if (!webhookData) return { status: false, type: key };
   
        if (key === 'CREDIT') {
            await sendToQueue('', 'games_cashout', JSON.stringify({ ...webhookData, operatorId: playerDetails.operatorId, token: playerDetails.token }));
            return { status: true, type: key };
        };


        data.txn_id = webhookData.txn_id;
        const sendRequest = await sendRequestToAccounts(webhookData, playerDetails.token);
        if (!sendRequest) return { status: false, type: key };

        return { status: true, type: key, txn_id: data.txn_id };
    } catch (err: any) {
        console.error(`Err while updating Player's balance is`, err.message);
        return { status: true, type: key };
    }
}

export const sendRequestToAccounts = async (webhookData: WebhookData, token: string): Promise<Boolean> => {
    try {
        const url = process.env.BASE_URL;

        if (!url) throw new Error('Service base URL is not defined');

        let clientServerOption: AxiosRequestConfig = {
            method: 'POST',
            url: `${url}/service/operator/user/balance/v2`,
            headers: {
                token
            },
            data: webhookData,
            timeout: 5000
        }
        const data = (await axios(clientServerOption))?.data;
        thirdPartyLogger.info(JSON.stringify({ logId: generateUUIDv7(), req: clientServerOption, res: data }));

        if (!data.status) return false;

        return true;
    } catch (err: any) {
        console.error(`Err while sending request to accounts is::: ${err.message}`);
        failedThirdPartyLogger.error(JSON.stringify({ logId: generateUUIDv7(), req: { webhookData, token }, res: err?.response?.status }));
        return false;
    }
}


export const prepareDataForWebhook = async (betObj: BetsData, key: WebhookKey): Promise<WebhookData | false> => {
    try {
        let { id, bet_amount, winning_amount, game_id, user_id, txn_id, ip, bet_id } = betObj;

        const amountFormatted = Number(bet_amount).toFixed(2);
        let baseData: WebhookData = {
            txn_id: generateUUIDv7(),
            ip,
            game_id,
            user_id
        };

        if (key == 'DEBIT') return {
            ...baseData,
            amount: amountFormatted,
            description: `${Number(bet_amount).toFixed(2)} debited for Teen Patti 2.0 game for Round ${id}`,
            bet_id,
            txn_type: 0
        }
        else if (key == 'CREDIT') return {
            ...baseData,
            amount: winning_amount,
            txn_ref_id: txn_id,
            description: `${winning_amount} credited for Teen Patti 2.0 game for Round ${id}`,
            txn_type: 1
        }
        else return baseData;
    } catch (err: any) {
        console.error(`[ERR] while trying to prepare data for webhook is::`, err.message);
        return false;
    }
};

